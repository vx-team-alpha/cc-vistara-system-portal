import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
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

  async function setCillAndGetSvg(desc) {
    await page.evaluate(async (desc) => {
      const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
      const currentItem = basket.currentItem;
      const cillQ = currentItem.specification.find((q) => q.name.toLowerCase() === "cill");
      const opt = cillQ.options.find((o) => o.description.includes(desc));

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
          NewOptionId: opt.id,
          OnlyTheseComponents: (cillQ.components || []).map((c) => c.id),
          Rule: 0,
        }),
      });
    }, desc);

    await page.reload();
    await page.waitForTimeout(3500);

    return page.evaluate(() => {
      const svg = document.querySelector("svg")?.outerHTML || "";
      const match = svg.match(
        /Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5[\s\S]*?<\/g>\s*<\/g>/,
      );
      return match ? match[0] : "NOT_FOUND";
    });
  }

  const cill95 = await setCillAndGetSvg("95mm");
  console.log("95mm member:\n", cill95);

  const cill180 = await setCillAndGetSvg("180mm");
  console.log("180mm member:\n", cill180);

  await browser.close();
}

main().catch(console.error);
