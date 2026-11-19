import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env.local"))) {
  process.loadEnvFile(path.join(root, ".env.local"));
}

const dbUrl =
  process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureCatalogueRecords() {
  const force = process.argv.includes("--update-catalogue") || process.argv.includes("--force");

  const [rangesRes, layoutsRes, assetsRes] = await Promise.all([
    adminClient.from("product_ranges").select("id", { count: "exact", head: true }),
    adminClient.from("layouts").select("id", { count: "exact", head: true }),
    adminClient.from("assets").select("id", { count: "exact", head: true }),
  ]);

  const rangeCount = rangesRes.count || 0;
  const layoutCount = layoutsRes.count || 0;
  const assetCount = assetsRes.count || 0;

  const needsCatalogue = force || rangeCount === 0 || layoutCount === 0 || assetCount === 0;

  if (needsCatalogue) {
    console.log(
      "📦 Updating database records with catalogue data (product ranges, layouts, assets)...",
    );
    const catalogueScript = path.join(root, "scripts", "catalogue", "seed.mjs");
    execFileSync(process.execPath, [catalogueScript, "seed"], { stdio: "inherit" });
    console.log("✅ Catalogue database records updated.\n");
  } else {
    console.log(
      `📦 Catalogue records verified (${rangeCount} product ranges, ${layoutCount} layouts, ${assetCount} assets).\n`,
    );
  }
}

async function run() {
  // Step 1: First update/ensure DB records so components can link to products
  await ensureCatalogueRecords();

  // Step 2: Apply seed SQL script (users, accounts, and styled embed_widgets)
  const seedFile = path.join(root, "supabase", "seed.sql");
  console.log("👤 Seeding accounts, users, and embed components from:", seedFile);

  try {
    execFileSync("psql", [dbUrl, "-f", seedFile], { stdio: "inherit" });
    console.log("\nSeed SQL successfully applied.");
  } catch (error) {
    console.error("\nFailed to execute seed SQL with psql:", error.message);
    process.exit(1);
  }

  // Step 3: Verify credentials and component links
  if (supabaseUrl && anonKey) {
    const authClient = createClient(supabaseUrl, anonKey);

    console.log("\nVerifying user credentials:");
    for (const [email, label] of [
      ["admin@mail.com", "Admin User"],
      ["testing@mail.com", "Simple Business User"],
    ]) {
      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password: email,
      });

      if (error) {
        console.error(`❌ Failed to sign in as ${label} (${email}):`, error.message);
      } else {
        console.log(
          `✅ ${label} signed in successfully! User ID: ${data.user.id}, Role: ${data.user.app_metadata?.role}`,
        );
      }
    }

    // Step 4: Verify components and their linked product counts
    const { data: widgets } = await adminClient
      .from("embed_widgets")
      .select(
        "name, configurator_type_id, configurator_types(slug, label), brand_name, brand_primary_color, brand_background_color, brand_text_color, enabled",
      )
      .order("created_at", { ascending: true });

    // Fetch product counts per configurator type to verify linkage
    const [doorLayouts, windowLayouts] = await Promise.all([
      adminClient
        .from("layouts")
        .select("id, product_ranges!inner(configurator_type_id)", { count: "exact", head: true })
        .eq("product_ranges.configurator_type_id", 1)
        .eq("active", true),
      adminClient
        .from("layouts")
        .select("id, product_ranges!inner(configurator_type_id)", { count: "exact", head: true })
        .eq("product_ranges.configurator_type_id", 2)
        .eq("active", true),
    ]);

    const productCounts = {
      1: doorLayouts.count || 0,
      2: windowLayouts.count || 0,
    };

    console.log(`\nConfigured components (${widgets?.length ?? 0}):`);
    for (const w of widgets ?? []) {
      const type = w.configurator_types?.label || "Unknown";
      const status = w.enabled ? "Live" : "Paused";
      const availableProducts = productCounts[w.configurator_type_id] ?? 0;
      console.log(
        `  - [${type}] "${w.name}" (${status}) -> ${availableProducts} products linked | Brand: ${w.brand_name} | Primary: ${w.brand_primary_color}, Bg: ${w.brand_background_color}`,
      );
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
