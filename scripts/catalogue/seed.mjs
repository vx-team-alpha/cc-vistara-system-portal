import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { buildCatalogue } from "./data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (existsSync(path.join(root, ".env.local"))) process.loadEnvFile(path.join(root, ".env.local"));
const command = process.argv[2];
let source = path.resolve(root, process.env.FRONTAGE_SOURCE || "cc-/web");
if (!existsSync(path.join(source, "public")) && existsSync(path.join(source, "web", "public"))) {
  source = path.join(source, "web");
}
const publicDir = path.join(source, "public");
const out = path.resolve(
  root,
  process.env.FRONTAGE_SEED_DIR ||
    (existsSync(path.resolve(root, "frontage-seed")) &&
    !existsSync(path.resolve(root, ".frontage-seed"))
      ? "frontage-seed"
      : ".frontage-seed"),
);
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /\/$/,
  "",
);
const bucket = process.env.FRONTAGE_ASSET_BUCKET || "frontage-assets";
const base = (
  process.env.FRONTAGE_ASSET_BASE_URL || `${url}/storage/v1/object/public/${bucket}`
).replace(/\/$/, "");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const save = (name, value) =>
  writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
const mime = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".json": "application/json",
};
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) =>
      statSync(path.join(dir, e.name)).isDirectory()
        ? walk(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );

function prepare() {
  if (!url)
    throw new Error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for the target storage URLs.");
  if (!existsSync(publicDir)) {
    const hint = source.includes("frontage-seed")
      ? " (Note: FRONTAGE_SOURCE should point to the MVP web directory such as 'cc-/web', not FRONTAGE_SEED_DIR / 'frontage-seed'.)"
      : "";
    throw new Error(
      `MVP source not found: ${publicDir}. Set FRONTAGE_SOURCE to its web directory.${hint}`,
    );
  }
  mkdirSync(path.join(out, "objects"), { recursive: true });
  const mimeOf = (file) => {
    if (mime[path.extname(file).toLowerCase()]) return mime[path.extname(file).toLowerCase()];
    const bytes = readFileSync(file);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      return "image/png";
    return null;
  };
  const files = walk(publicDir).filter((f) => mimeOf(f));
  const aliases = new Map(
    files.map((f) => ["/" + path.relative(publicDir, f).split(path.sep).join("/"), f]),
  );
  const manifest = json(path.join(publicDir, "catalogue/manifest.json"));
  const originalUrls = new Map();
  for (const [external, asset] of Object.entries(manifest.assets)) {
    if (aliases.has(asset.src)) {
      aliases.set(external, aliases.get(asset.src));
      originalUrls.set(aliases.get(asset.src), external);
    }
  }
  const windowsIndex = json(path.join(publicDir, "window-data/index.json"));
  for (const product of windowsIndex.products) {
    const imageFile = path.join(publicDir, "window-data", product.folder, "option-images.json");
    for (const row of json(imageFile)) {
      const i = row.path?.indexOf("advance70-casement/");
      const local =
        i >= 0 ? `/window-data/${row.path.slice(i + "advance70-casement/".length)}` : row.path;
      if (aliases.has(local)) {
        aliases.set(row.url, aliases.get(local));
        originalUrls.set(aliases.get(local), row.url);
      }
    }
  }
  const registry = new Map(),
    assets = new Map(),
    missing = new Set(),
    visiting = new Set();
  function resolve(value, parent) {
    if (aliases.has(value)) return aliases.get(value);
    const i = value.indexOf("advance70-casement/");
    if (i >= 0 && aliases.has("/window-data/" + value.slice(i + 19)))
      return aliases.get("/window-data/" + value.slice(i + 19));
    if (parent && !/^(?:https?:|data:|#)/.test(value)) {
      const candidate = path.resolve(
        path.dirname(parent),
        value.startsWith("/")
          ? path.relative(path.dirname(parent), path.join(publicDir, value))
          : value,
      );
      if (files.includes(candidate)) return candidate;
    }
    return null;
  }
  function rewrite(value, parent) {
    if (typeof value === "string") {
      const file = resolve(value, parent);
      if (file) return ingest(file).cdn_url;
      if (/^\/(catalogue|options|svgs|renders|glass|diagrams|window-data)\//.test(value))
        missing.add(value);
      return value;
    }
    if (Array.isArray(value)) return value.map((x) => rewrite(x, parent));
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, parent)]));
    return value;
  }
  function ingest(file) {
    if (registry.has(file)) return registry.get(file);
    if (visiting.has(file)) throw new Error(`Cyclic asset dependency: ${file}`);
    visiting.add(file);
    const extension =
      path.extname(file).toLowerCase() || (mimeOf(file) === "image/png" ? ".png" : ".jpg");
    let content = readFileSync(file);
    if (extension === ".svg") {
      content = Buffer.from(
        content
          .toString()
          .replace(
            /((?:xlink:)?href\s*=\s*["'])([^"']+)(["'])/g,
            (_, prefix, value, suffix) => prefix + rewrite(value, file) + suffix,
          ),
      );
    } else if (extension === ".json")
      content = Buffer.from(JSON.stringify(rewrite(JSON.parse(content.toString()), file)));
    const hash = createHash("sha256").update(content).digest("hex");
    // Identical bytes may appear under different extensions or aliases. Reuse
    // the canonical object so no reference points at an unuploaded duplicate.
    if (assets.has(hash)) {
      const existing = assets.get(hash);
      registry.set(file, existing);
      visiting.delete(file);
      return existing;
    }
    const storage_key = `assets/${hash}${extension}`;
    const asset = {
      hash,
      storage_key,
      external_url:
        originalUrls.get(file) ||
        `frontage://mvp/${path.relative(publicDir, file).split(path.sep).join("/")}`,
      mime_type: mimeOf(file),
      byte_size: content.length,
      cdn_url: `${base}/${storage_key}`,
    };
    writeFileSync(path.join(out, "objects", hash), content);
    registry.set(file, asset);
    assets.set(hash, asset);
    visiting.delete(file);
    return asset;
  }
  // Resolve referenced binary assets before catalogues; source JSON remains untouched.
  for (const file of files) ingest(file);
  const mapped = (value) => rewrite(value);
  const windows = windowsIndex.products.map((product) => {
    const dir = path.join(publicDir, "window-data", product.folder);
    const styles = json(path.join(dir, "styles.json"));
    return {
      product,
      styles,
      items: Object.fromEntries(
        styles.map((s) => [s.slug, json(path.join(dir, "items", s.slug + ".json"))]),
      ),
      shared: json(path.join(dir, "questions.json")),
      overrides: json(path.join(dir, "questions-by-style.json")),
    };
  });
  const rows = buildCatalogue(
    mapped(manifest),
    mapped(json(path.join(source, "src/catalog.json"))),
    mapped(windows),
  );
  const paths = Object.fromEntries(
    [...aliases].map(([alias, file]) => [alias, registry.get(file)]),
  );
  const aliasBytes = Buffer.from(
    JSON.stringify(
      Object.fromEntries(Object.entries(paths).map(([key, asset]) => [key, asset.cdn_url])),
    ),
  );
  const aliasHash = createHash("sha256").update(aliasBytes).digest("hex");
  writeFileSync(path.join(out, "objects", aliasHash), aliasBytes);
  assets.set(aliasHash, {
    hash: aliasHash,
    storage_key: `assets/${aliasHash}.json`,
    external_url: "frontage://asset-map",
    mime_type: "application/json",
    byte_size: aliasBytes.length,
    cdn_url: `${base}/assets/${aliasHash}.json`,
  });
  const report = {
    url,
    bucket,
    base,
    source,
    counts: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])),
    assets: assets.size,
    source_files: files.length,
    bytes: [...assets.values()].reduce((sum, a) => sum + a.byte_size, 0),
    unresolved_paths: [...missing].sort(),
    snapshots: Object.fromEntries(
      ["catalogue/manifest.json", "window-data/index.json"].map((p) => [p, paths["/" + p].cdn_url]),
    ),
  };
  save("catalogue.json", rows);
  save("assets.json", [...assets.values()]);
  save("asset-paths.json", paths);
  save("report.json", report);
  console.log(JSON.stringify(report, null, 2));
}

function client() {
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  const report = json(path.join(out, "report.json"));
  if (report.url !== url || report.bucket !== bucket || report.base !== base)
    throw new Error("Target changed. Run prepare again before upload or seed.");
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function checked(promise, context) {
  const { data, error } = await promise;
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}
async function upload() {
  const db = client();
  const buckets = await checked(db.storage.listBuckets(), "List storage buckets");
  const existing = buckets.find((b) => b.id === bucket);
  if (!existing)
    await checked(db.storage.createBucket(bucket, { public: true }), "Create public asset bucket");
  else if (!existing.public)
    throw new Error(`${bucket} is private; choose a public catalogue bucket.`);
  const assets = json(path.join(out, "assets.json"));
  let cursor = 0,
    completed = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < assets.length) {
        const asset = assets[cursor++];
        for (let attempt = 0; ; attempt++) {
          const { error } = await db.storage
            .from(bucket)
            .upload(asset.storage_key, readFileSync(path.join(out, "objects", asset.hash)), {
              contentType: asset.mime_type,
              cacheControl: "31536000",
              upsert: false,
            });
          if (!error || String(error.statusCode) === "409" || error.error === "Duplicate") break;
          if (attempt >= 2) throw new Error(`Upload ${asset.storage_key}: ${error.message}`);
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
        completed++;
        if (completed % 200 === 0)
          console.log(`Uploaded or already present: ${completed}/${assets.length}`);
      }
    }),
  );
  // Record successful upload separately; seeding refuses unuploaded preparations.
  save("uploaded.json", {
    target: json(path.join(out, "report.json")),
    hashes: assets.map((a) => a.hash).sort(),
  });
  console.log(`Storage ready: ${assets.length} immutable objects.`);
}
async function seed() {
  const db = client();
  const assets = json(path.join(out, "assets.json"));
  const uploaded = json(path.join(out, "uploaded.json"));
  if (
    JSON.stringify(uploaded.target) !== JSON.stringify(json(path.join(out, "report.json"))) ||
    JSON.stringify(uploaded.hashes) !== JSON.stringify(assets.map((a) => a.hash).sort())
  )
    throw new Error("Run upload for this preparation first.");
  const rows = json(path.join(out, "catalogue.json"));
  const types = await checked(
    db
      .from("configurator_types")
      .upsert(
        [
          { slug: "door", label: "Doors" },
          { slug: "window", label: "Windows" },
        ],
        { onConflict: "slug" },
      )
      .select("id,slug"),
    "Seed configurator types",
  );
  rows.product_ranges = rows.product_ranges.map(({ configurator_type_slug, ...row }) => ({
    ...row,
    configurator_type_id: types.find((t) => t.slug === configurator_type_slug).id,
  }));
  for (const [table, values] of Object.entries({ assets, ...rows })) {
    for (let i = 0; i < values.length; i += 100) {
      const batch = values.slice(i, i + 100);
      // Keep existing asset primary keys stable, while allowing CDN/storage
      // location metadata to change when preparing for a different host.
      const payload = table === "assets" ? batch.map(({ id: _id, ...asset }) => asset) : batch;
      await checked(
        db.from(table).upsert(payload, { onConflict: table === "assets" ? "hash" : "id" }),
        `Seed ${table} batch ${i}`,
      );
      if (i > 0 && i % 10000 === 0) console.log(`${table}: ${i}/${values.length}`);
    }
    console.log(`${table}: ${values.length} rows seeded`);
  }
}
try {
  if (command === "prepare") prepare();
  else if (command === "upload") await upload();
  else if (command === "seed") await seed();
  else throw new Error("Usage: node scripts/catalogue/seed.mjs <prepare|upload|seed>");
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}
