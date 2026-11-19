import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      console.log(">> REQ:", req.method(), req.url());
      if (req.postData()) {
        try {
          console.log("   PAYLOAD:", JSON.stringify(JSON.parse(req.postData())));
        } catch {
          console.log("   PAYLOAD:", req.postData());
        }
      }
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      console.log("<< RES:", res.status(), res.url());
      try {
        const text = await res.text();
        console.log("   BODY LENGTH:", text.length, "PREVIEW:", text.slice(0, 100));
      } catch (e) {
        console.log("   BODY ERROR:", e.message);
      }
    }
  });

  console.log("Navigating...");
  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log("Ready at design page. Clicking Letterplate in UI if available...");
  const letterplateButton = page.locator("button:has-text('Letterplate')").first();
  if (await letterplateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Clicking Letterplate button...");
    await letterplateButton.click();
    await page.waitForTimeout(3000);
  }

  await browser.close();
}

main().catch(console.error);
