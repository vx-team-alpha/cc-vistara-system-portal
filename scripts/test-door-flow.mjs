import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.url().includes("UpdateJobLineItemOption")) {
      console.log(">> REQ UpdateJobLineItemOption:", req.postData());
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("UpdateJobLineItemOption")) {
      const json = await res.json();
      console.log(
        "<< RES UpdateJobLineItemOption questions:",
        json.specification?.map((q) => q.name),
      );
    }
  });

  await page.goto(LAUNCH, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /Start Designing/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await page.getByText("Standard foam filled composite doors").first().click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Door Left Hand", exact: true }).first().click();
  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Navigate to Door Design (Question 3)
  for (let i = 0; i < 2; i++) {
    await page.getByText("Next Question", { exact: true }).first().click();
    await page.waitForTimeout(1000);
  }

  // Click Belfry Farmhouse
  console.log("Clicking Belfry Farmhouse...");
  const belfry = page.getByText("Belfry Farmhouse", { exact: true }).first();
  await belfry.click();
  await page.waitForTimeout(3000);

  // Advance to Handle
  console.log("Advancing to Handle...");
  for (let i = 0; i < 15; i++) {
    const heading = await page.evaluate(() => {
      return document.body.innerText.match(/([A-Za-z ()]+)\s+(\d+\s+of\s+\d+)/)?.[1]?.trim() || "";
    });
    console.log("Current heading:", heading);
    if (/^Handle\b/i.test(heading)) break;
    await page.getByText("Next Question", { exact: true }).first().click();
    await page.waitForTimeout(1000);
  }

  // Click 1200 Inline Bar Handle
  console.log("Clicking 1200 Inline Bar Handle...");
  const inline = page.getByText("1200 Inline Bar Handle", { exact: false }).first();
  await inline.click();
  await page.waitForTimeout(4000);

  // Check what heading is next or if Escutcheon appeared
  const headingAfter = await page.evaluate(() => {
    return document.body.innerText.match(/([A-Za-z ()]+)\s+(\d+\s+of\s+\d+)/)?.[0]?.trim() || "";
  });
  console.log("Heading after inline bar selection:", headingAfter);

  // Click Next Question
  await page.getByText("Next Question", { exact: true }).first().click();
  await page.waitForTimeout(2000);

  const headingNext = await page.evaluate(() => {
    return document.body.innerText.match(/([A-Za-z ()]+)\s+(\d+\s+of\s+\d+)/)?.[0]?.trim() || "";
  });
  console.log("Heading next question:", headingNext);

  await browser.close();
}

main().catch(console.error);
