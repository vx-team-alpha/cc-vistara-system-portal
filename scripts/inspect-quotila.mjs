import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.url().includes("/api/processing/")) {
      console.log(">> REQ:", req.method(), req.url());
      try {
        const postData = req.postData();
        if (postData) {
          console.log("   DATA:", postData.slice(0, 200));
        }
      } catch {}
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("/api/processing/")) {
      console.log("<< RES:", res.status(), res.url());
      try {
        const ct = res.headers()["content-type"] || "";
        if (ct.includes("json")) {
          const json = await res.json();
          console.log("   JSON keys:", Object.keys(json));
          if (res.url().includes("UpdateJobLineItemOption") || res.url().includes("ItemOption")) {
            console.log("   SPEC length:", json.specification?.length);
          }
        }
      } catch {}
    }
  });

  console.log("Navigating to launch...");
  await page.goto(LAUNCH, { waitUntil: "networkidle" });

  // Dismiss cookie
  try {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button, div")).find((e) =>
        e.innerText?.includes("Cookie Notice"),
      );
      btn?.querySelector("button")?.click();
    });
  } catch {}

  console.log("Clicking Start Designing...");
  await page
    .getByRole("button", { name: /Start Designing/i })
    .first()
    .click();
  await page.waitForTimeout(2000);

  console.log("Selecting ORiGINAL...");
  await page.getByText("Standard foam filled composite doors").first().click();
  await page.waitForTimeout(2000);

  console.log("Selecting Door Left Hand...");
  await page.getByRole("button", { name: "Door Left Hand", exact: true }).first().click();
  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log("At design page URL:", page.url());

  await browser.close();
}

main().catch(console.error);
