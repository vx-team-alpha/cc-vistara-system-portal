import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Loading launch page...");
  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  console.log("Waiting for ORiGINAL group...");
  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  console.log("Waiting for Door Left Hand...");
  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  console.log("Waiting for design URL...");
  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log("Arrived at:", page.url());

  const basket = await page.evaluate(() => {
    return JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
  });

  console.log("ContractIdentifier:", basket.contractIdentifier);
  console.log("JobKey:", basket.job?.jobKey);
  console.log("ItemKey:", basket.currentItem?.itemKey);

  await browser.close();
}

main().catch(console.error);
