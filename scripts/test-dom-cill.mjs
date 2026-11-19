import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  await mkdir(path.resolve("tmp/cill-dom"), { recursive: true });
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

  // Capture baseline No Cill SVG from DOM
  const noCillSvg = await page.evaluate(() => {
    return document.querySelector("svg")?.outerHTML || "";
  });
  await writeFile("tmp/cill-dom/no-cill.svg", noCillSvg);
  console.log("No Cill SVG length:", noCillSvg.length);

  // Select 155mm Cill in the UI / via API then wait for SVG update
  await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const currentItem = basket.currentItem;
    const cillQ = currentItem.specification.find((q) => q.name.toLowerCase() === "cill");
    const opt155 = cillQ.options.find((o) => o.description.includes("155mm"));

    await fetch("https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-quotila-app": "portal" },
      body: JSON.stringify({
        ContractId: currentItem.contractId,
        JobKey: currentItem.jobKey,
        ItemKey: currentItem.itemKey,
        ProcessingLevel: 306,
        OptionHeadingId: cillQ.id || cillQ.optionHeadingId,
        NewOptionId: opt155.id,
        OnlyTheseComponents: (cillQ.components || []).map((c) => c.id),
        Rule: 0,
      }),
    });
  });

  // Reload page so Vue redraws with the updated basket/JobLineItem
  await page.reload();
  await page.waitForTimeout(4000);

  const cill155SvgReloaded = await page.evaluate(() => {
    return document.querySelector("svg")?.outerHTML || "";
  });
  await writeFile("tmp/cill-dom/155mm-cill.svg", cill155SvgReloaded);
  console.log("155mm Cill SVG length after reload:", cill155SvgReloaded.length);

  await browser.close();
}

main().catch(console.error);
