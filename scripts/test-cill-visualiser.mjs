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

    async function setOptionAndGetSvg(questionName, optionId) {
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
          FormatImagesForVisualiser: true,
        }),
      });
      currentItem = await getRes.json();
      return currentItem.images?.[0]?.svg || "";
    }

    const cillQ = currentItem.specification.find((q) => q.name.toLowerCase() === "cill");
    const cill155 = cillQ.options.find((o) => o.description.includes("155mm"));
    const noCill = cillQ.options.find((o) => o.description.includes("No Cill"));
    const cill95 = cillQ.options.find((o) => o.description.includes("95mm"));
    const cill180 = cillQ.options.find((o) => o.description.includes("180mm"));

    const svgNoCill = await setOptionAndGetSvg("Cill", noCill.id);
    const svg155 = await setOptionAndGetSvg("Cill", cill155.id);
    const svg95 = await setOptionAndGetSvg("Cill", cill95.id);
    const svg180 = await setOptionAndGetSvg("Cill", cill180.id);

    return {
      noCill: svgNoCill,
      cill155: svg155,
      cill95: svg95,
      cill180: svg180,
    };
  });

  await browser.close();

  for (const [key, svg] of Object.entries(res)) {
    console.log(`${key} svg length:`, svg.length);
    await writeFile(path.resolve(`tmp/${key}.svg`), svg, "utf-8");
  }
}

main().catch(console.error);
