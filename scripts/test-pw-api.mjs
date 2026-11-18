import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";
const BASE = "https://doorco.server.quotila.com/api";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to launch...");
  await page.goto(LAUNCH, { waitUntil: "load" });
  await page.waitForTimeout(2000);

  // Now let's try calling GetProcessingLevel using context.request
  console.log("Testing context.request.post to GetProcessingLevel...");
  const res = await context.request.post(`${BASE}/processing/GetProcessingLevel`, {
    data: {},
    headers: {
      "content-type": "application/json",
      "x-quotila-app": "portal",
      referer: "https://doorco.portal.quotila.com/",
    },
  });

  console.log("Status:", res.status());
  console.log("Body:", await res.text());

  await browser.close();
}

main().catch(console.error);
