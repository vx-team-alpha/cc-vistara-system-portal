import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";
const OUT_FILE = path.resolve("data/door-letterplate-positions.json");

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.startsWith("[PROGRESS]")) console.log(text);
  });

  console.log("Navigating to design...");
  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log("Starting scraping of all door designs for letterplate positions...");

  const results = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    let currentItem = basket.currentItem;
    const contractId = currentItem.contractId;
    const jobKey = currentItem.jobKey;
    const itemKey = currentItem.itemKey;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    async function setOption(questionName, optionId) {
      const q = currentItem.specification.find((q) =>
        q.name.toLowerCase().includes(questionName.toLowerCase()),
      );
      if (!q) throw new Error(`Question ${questionName} not found`);

      const res = await fetch(
        "https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", "x-quotila-app": "portal" },
          body: JSON.stringify({
            ContractId: contractId,
            JobKey: jobKey,
            ItemKey: itemKey,
            ProcessingLevel: procLevel,
            OptionHeadingId: q.id || q.optionHeadingId,
            NewOptionId: optionId,
            OnlyTheseComponents: (q.components || []).map((c) => c.id),
            Rule: 0,
          }),
        },
      );
      currentItem = await res.json();
      return currentItem;
    }

    const doorDesignQ = currentItem.specification.find((q) => q.name.includes("Door Design"));
    const designs = doorDesignQ.options.map((o) => ({ id: o.id, description: o.description }));

    const map = {};

    for (let i = 0; i < designs.length; i++) {
      const d = designs[i];
      try {
        await setOption("Door Design", d.id);

        const letterQ = currentItem.specification.find(
          (q) => q.name.toLowerCase() === "letterplate",
        );
        const letterOpt = letterQ?.options.find(
          (o) => o.description.toLowerCase() === "letterplate",
        );

        if (letterOpt) {
          await setOption("Letterplate", letterOpt.id);
        }

        const posQ = currentItem.specification.find((q) =>
          q.name.toLowerCase().includes("letterplate position"),
        );
        const positions = posQ
          ? posQ.options.map((o) => ({
              id: o.id,
              description: o.description,
              isCurrentOption: o.isCurrentOption,
            }))
          : [];

        map[d.description] = {
          designId: d.id,
          hasLetterplateOption: Boolean(letterOpt),
          positions,
        };

        console.log(
          `[PROGRESS] [${i + 1}/${designs.length}] ${d.description}: ${positions.length} positions`,
        );
      } catch (err) {
        console.log(
          `[PROGRESS] [${i + 1}/${designs.length}] ${d.description} ERROR: ${err.message}`,
        );
        map[d.description] = {
          designId: d.id,
          error: err.message,
          positions: [],
        };
      }
    }

    // Now scrape Escutcheon options for all Hardware Colours
    const escMap = {};
    try {
      const handleQ = currentItem.specification.find((q) => q.name.toLowerCase() === "handle");
      const barOpt = handleQ?.options.find((o) => o.description.includes("Inline Bar"));
      if (barOpt) {
        await setOption("Handle", barOpt.id);
        const hwQ = currentItem.specification.find((q) => q.name.includes("Hardware Colour"));
        const colours = hwQ?.options || [];
        for (const c of colours) {
          await setOption("Hardware Colour", c.id);
          const escQ = currentItem.specification.find((q) => q.name.includes("Escutcheon"));
          escMap[c.description] = {
            colourId: c.id,
            options: escQ?.options.map((o) => ({ id: o.id, description: o.description })) || [],
          };
          console.log(
            `[PROGRESS] Hardware Colour: ${c.description} -> Escutcheon:`,
            escMap[c.description].options.map((o) => o.description),
          );
        }
      }
    } catch (e) {
      console.log("[PROGRESS] Escutcheon capture error:", e.message);
    }

    return {
      designs: map,
      escutcheonsByHardwareColour: escMap,
    };
  });

  await browser.close();

  console.log(`Scraped ${Object.keys(results).length} door designs.`);
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  console.log(`Saved to ${OUT_FILE}`);
}

main().catch(console.error);
