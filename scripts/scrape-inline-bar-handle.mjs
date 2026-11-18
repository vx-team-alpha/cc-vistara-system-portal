import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Capture the Doorco Quotila "1200 Inline Bar Handle" elevation assets
 * from Belfry Farmhouse, then download slab handle PNGs for chrome/black.
 *
 * Usage: node scripts/scrape-inline-bar-handle.mjs
 */
import { chromium } from "playwright";

const PORTAL = "https://doorco.portal.quotila.com";
const LAUNCH = `${PORTAL}/launch/nationwidecompositedoors`;
const OUT = path.resolve("tmp/inline-bar-capture");
const HARDWARE = path.resolve("public/hardware");

async function dismissCookie(page) {
  await page.evaluate(() => {
    const n = [...document.querySelectorAll("div")].find(
      (d) =>
        d.innerText?.includes("Cookie Notice") &&
        d.innerText?.includes("This website collects cookies"),
    );
    if (!n) return;
    const close =
      n.querySelector("button") ||
      [...n.querySelectorAll("*")].find((el) =>
        /close|dismiss||×|x/i.test(el.getAttribute("aria-label") || el.innerText || ""),
      );
    (close || n).click();
    n.remove();
  });
}

async function clickText(page, text, exact = false) {
  const locator = exact
    ? page.getByText(text, { exact: true })
    : page.getByText(text, { exact: false });
  await locator.first().click({ timeout: 20000 });
}

async function nextQuestion(page) {
  await dismissCookie(page);
  const clicked = await page.evaluate(() => {
    const labels = ["Next Question", "Next option", "Next Option", "Next"];
    const el = [...document.querySelectorAll("button, a, div, span")].find((e) => {
      const t = (e.innerText || "").trim();
      return labels.includes(t);
    });
    if (!el) return false;
    el.click();
    return true;
  });
  if (!clicked) throw new Error("Next Question not found");
  await page.waitForTimeout(1200);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

function hrefs(svg) {
  return [...svg.matchAll(/(?:xlink:)?href="([^"]+)"/g)].map((m) => m[1]);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(HARDWARE, { recursive: true });
  const captures = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("response", async (response) => {
    if (!response.url().includes("/api/")) return;
    try {
      const ct = response.headers()["content-type"] || "";
      if (!ct.includes("json")) return;
      const body = await response.json();
      captures.push({ url: response.url(), body });
    } catch {
      /* ignore non-json */
    }
  });

  console.log("open launch");
  await page.goto(LAUNCH, { waitUntil: "load" });
  await dismissCookie(page);
  await page
    .getByRole("button", { name: /Start Designing/i })
    .first()
    .click({ timeout: 10000 });
  await page.getByText("ORiGINAL Composite Doors").first().waitFor({ timeout: 30000 });
  await dismissCookie(page);
  await clickText(page, "Standard foam filled composite doors");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "01-layouts.png"), fullPage: true });

  // Prefer an explicit layout card / svg image, fall back to first design link.
  const layout = page.locator("[data-svgImage]").first();
  if (await layout.count()) {
    await layout.click();
  } else {
    await page
      .locator("a, button, [role='button']")
      .filter({ hasText: /door|left|right|single/i })
      .first()
      .click({ timeout: 15000 });
  }
  await page.waitForURL(/\/design\//, { timeout: 45000 });
  await page.waitForTimeout(5000);
  await dismissCookie(page);
  await page.screenshot({ path: path.join(OUT, "02-design.png"), fullPage: true });

  const nextReady = await page
    .getByText(/Next Question|Next option|Next/i)
    .first()
    .waitFor({ timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!nextReady) {
    const body = (await page.innerText("body")).slice(0, 1500);
    await writeFile(path.join(OUT, "02-body.txt"), body);
    throw new Error("Design UI did not expose Next Question");
  }

  // Door Range → Opening → Door Design
  for (let i = 0; i < 2; i++) await nextQuestion(page);

  const search = page.getByPlaceholder(/Search/i);
  if (await search.count()) {
    await search.first().fill("Belfry Farmhouse");
    await page.waitForTimeout(500);
  }
  // Prefer plain "Belfry Farmhouse" over "Belfry 3 Farmhouse" when both match.
  const belfry = page.getByText(/^Belfry Farmhouse$/i);
  if (await belfry.count()) await belfry.first().click({ timeout: 15000 });
  else await page.getByText("Belfry Farmhouse", { exact: false }).first().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, "03-belfry.png"), fullPage: true });

  // Walk until Handle question
  for (let i = 0; i < 18; i++) {
    const heading = await page.evaluate(() => {
      const h = [...document.querySelectorAll("h1,h2,h3,h4,strong,div")].find((el) =>
        /^(Door|Glass|Hardware|Handle|Letterplate|Knocker|Spyhole|Cill|Threshold|Drip|Numeral|Cassette|Opening)/i.test(
          (el.innerText || "").trim().split("\n")[0] || "",
        ),
      );
      return (h?.innerText || "").trim().split("\n")[0];
    });
    console.log("question", heading);
    if (/^Handle$/i.test(heading) || /^Handle\b/i.test(heading)) break;
    await nextQuestion(page);
  }

  await page
    .getByText("1200 Inline Bar Handle", { exact: false })
    .first()
    .click({ timeout: 15000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, "inline-bar-selected.png"), fullPage: true });

  // Latest item payload with SVG images
  let item = null;
  for (const cap of [...captures].reverse()) {
    const body = cap.body;
    if (body?.images && body?.specification) {
      item = body;
      break;
    }
  }
  if (!item) throw new Error("No item payload with images");

  await writeFile(path.join(OUT, "item-keys.json"), JSON.stringify(Object.keys(item), null, 2));
  const handleUrls = new Set();
  for (const [i, img] of (item.images || []).entries()) {
    const svg = img.image || "";
    if (!String(svg).toLowerCase().includes("<svg")) continue;
    const file = path.join(OUT, `view-${i + 1}.svg`);
    await writeFile(file, svg, "utf8");
    for (const href of hrefs(svg)) {
      const decoded = decodeURIComponent(href);
      if (/handle|inline/i.test(decoded)) {
        handleUrls.add(href);
        console.log("handle href", decoded);
      }
    }
  }

  // Also collect option tile URLs from recent API bodies
  const optionTiles = new Set();
  for (const cap of captures) {
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node.description === "string" && /inline bar/i.test(node.description)) {
        if (node.imageUrl) optionTiles.add(node.imageUrl);
        if (node.src) optionTiles.add(node.src);
      }
      for (const v of Object.values(node)) walk(v);
    };
    walk(cap.body);
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    handleHrefs: [...handleUrls],
    optionTiles: [...optionTiles],
  };
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  // Download every distinct handle URL; prefer slab parts over thumbnails for elevation.
  let n = 0;
  for (const url of [...handleUrls, ...optionTiles]) {
    const decoded = decodeURIComponent(url);
    const base = path.basename(decoded.split("?")[0]).replace(/[^\w.-]+/g, "_");
    const dest = path.join(OUT, `${String(++n).padStart(2, "0")}-${base || "asset"}`);
    try {
      await download(url, dest);
      console.log("saved", dest);
    } catch (err) {
      console.warn("skip", url, err.message);
    }
  }

  // Install best black/chrome elevation assets into public/hardware
  const files = [...handleUrls].map((u) => decodeURIComponent(u));
  const black =
    files.find((u) => /inline.*black|black.*inline|1200.*black/i.test(u)) ||
    files.find((u) => /black/i.test(u) && /handle/i.test(u));
  const chrome =
    files.find((u) => /inline.*(chrome|satin|steel)|chrome.*inline/i.test(u)) ||
    files.find((u) => /(chrome|satin|steel)/i.test(u) && /handle/i.test(u));

  console.log("picked black", black);
  console.log("picked chrome", chrome);

  if (black) {
    await download(
      [...handleUrls].find((u) => decodeURIComponent(u) === black) || black,
      path.join(HARDWARE, "inline-bar-black.png"),
    );
  }
  if (chrome) {
    await download(
      [...handleUrls].find((u) => decodeURIComponent(u) === chrome) || chrome,
      path.join(HARDWARE, "inline-bar-chrome.png"),
    );
  }

  await browser.close();
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
