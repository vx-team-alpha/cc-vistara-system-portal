import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  await mkdir(path.resolve("tmp"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  const res = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    let currentItem = basket.currentItem;
    const contractId = currentItem.contractId;
    const jobKey = currentItem.jobKey;
    const itemKey = currentItem.itemKey;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    async function setOptionAndGetItem(questionName, optionId) {
      const q = currentItem.specification.find((q) =>
        q.name.toLowerCase().includes(questionName.toLowerCase()),
      );
      await fetch("https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption", {
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
      });

      const getRes = await fetch("https://doorco.server.quotila.com/api/processing/JobLineItem", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-quotila-app": "portal" },
        body: JSON.stringify({
          ContractId: contractId,
          JobKey: jobKey,
          ItemKey: itemKey,
          ProcessingLevel: procLevel,
          Recalculate: false,
          FormatImagesForVisualiser: false,
        }),
      });
      currentItem = await getRes.json();
      return currentItem;
    }

    const cillQ = currentItem.specification.find((q) => q.name.toLowerCase() === "cill");
    const cill155 = cillQ.options.find((o) => o.description.includes("155mm"));
    const noCill = cillQ.options.find((o) => o.description.includes("No Cill"));

    // 1. Get No Cill
    const itemNoCill = await setOptionAndGetItem("Cill", noCill.id);
    const svgNoCill = itemNoCill.images?.find((img) => img.drawingType === 1)?.svg || "";

    // 2. Get 155mm Cill
    const item155 = await setOptionAndGetItem("Cill", cill155.id);
    const svg155 = item155.images?.find((img) => img.drawingType === 1)?.svg || "";

    return {
      noCillLength: svgNoCill.length,
      svgNoCill,
      cill155Length: svg155.length,
      svg155,
      imagesCount: item155.images?.length,
    };
  });

  await browser.close();

  console.log("No Cill SVG length:", res.noCillLength);
  console.log("155mm Cill SVG length:", res.cill155Length);
  await writeFile(path.resolve("tmp/no-cill.svg"), res.svgNoCill, "utf-8");
  await writeFile(path.resolve("tmp/155mm-cill.svg"), res.svg155, "utf-8");
}

main().catch(console.error);
