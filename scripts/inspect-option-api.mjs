import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function dismissCookie(page) {
  await page.evaluate(() => {
    const el = document.querySelector('[class*="Cookie"], [class*="cookie"]');
    if (el) el.remove();
    const all = Array.from(document.querySelectorAll("div")).filter((d) =>
      (d.innerText || "").includes("Cookie Notice"),
    );
    all.forEach((d) => d.remove());
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.url().includes("/api/processing/")) {
      console.log(`\nREQ [${req.method()}] ${req.url()}`);
      console.log("Headers:", JSON.stringify(req.headers()));
      if (req.postData()) console.log("PostData:", req.postData());
    }
  });

  page.on("response", async (res) => {
    if (
      res.url().includes("/api/processing/UpdateJobLineItemOption") ||
      res.url().includes("/api/processing/CreateJobLineItem")
    ) {
      const json = await res.json();
      console.log(`\nRES [${res.status()}] ${res.url()}`);
      console.log(
        "Specification Questions in response:",
        json.specification?.map((q) => ({
          name: q.name,
          optionsCount: q.options?.length,
          current: q.options?.find((o) => o.isCurrentOption)?.description,
        })),
      );
    }
  });

  await page.goto(LAUNCH, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page
    .getByRole("button", { name: /Start Designing/i })
    .first()
    .click();
  await page.waitForTimeout(1000);
  await dismissCookie(page);
  await page.getByText("Standard foam filled composite doors").first().click();
  await page.waitForTimeout(1000);
  await dismissCookie(page);
  await page.getByRole("button", { name: "Door Left Hand", exact: true }).first().click();
  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await dismissCookie(page);

  // Click an option, say Contemporary in Door Range or Next Question
  console.log("Clicking Next Question...");
  await page
    .locator("span, button")
    .filter({ hasText: /^Next Question$/ })
    .first()
    .click();
  await page.waitForTimeout(1000);
  await dismissCookie(page);

  // Click Open Out
  console.log("Clicking Open Out...");
  await page.getByText("Open Out", { exact: true }).first().click();
  await page.waitForTimeout(2000);

  await browser.close();
}

main().catch(console.error);
