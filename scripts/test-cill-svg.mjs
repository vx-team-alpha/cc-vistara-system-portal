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

    const cillQ = currentItem.specification.find((q) => q.name.toLowerCase() === "cill");
    const cillOptions = cillQ.options;

    const cillSvgs = {};

    for (const opt of cillOptions) {
      await setOption("Cill", opt.id);
      const extImg = currentItem.images?.find((img) => img.drawingType === 1);
      cillSvgs[opt.description] = {
        optId: opt.id,
        svg: extImg?.svg || "",
      };
    }

    return cillSvgs;
  });

  await browser.close();

  for (const [name, data] of Object.entries(res)) {
    console.log(`Cill [${name}]: SVG length = ${data.svg.length}`);
    await writeFile(path.resolve(`tmp/cill-${name.replace(/\s+/g, "_")}.svg`), data.svg, "utf-8");
  }
}

main().catch(console.error);
