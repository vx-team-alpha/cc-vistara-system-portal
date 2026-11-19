import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      console.log("REQ:", req.method(), req.url());
      if (req.postData()) console.log("   DATA:", req.postData());
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      try {
        const text = await res.text();
        console.log("RES:", res.status(), res.url(), text.slice(0, 150));
      } catch {}
    }
  });

  await page.goto(LAUNCH, { waitUntil: "load" });
  await page.waitForTimeout(2000);

  // Click start designing
  await page
    .getByRole("button", { name: /Start Designing/i })
    .first()
    .click();
  await page.waitForTimeout(3000);

  await browser.close();
}

main().catch(console.error);
