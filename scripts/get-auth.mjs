import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.url().includes("VendorGuest") || req.url().includes("OrganisationDetails")) {
      console.log("REQ:", req.method(), req.url());
      console.log("Headers:", JSON.stringify(req.headers()));
      console.log("Post:", req.postData());
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("VendorGuest") || res.url().includes("OrganisationDetails")) {
      console.log("RES:", res.status(), res.url());
      console.log("Headers:", JSON.stringify(res.headers()));
      try {
        console.log("Body:", await res.text());
      } catch {}
    }
  });

  await page.goto(LAUNCH, { waitUntil: "load" });
  await page.waitForTimeout(3000);

  const cookies = await context.cookies();
  console.log("Cookies:", cookies);

  const authSession = await page.evaluate(() => sessionStorage.getItem("branded_auth"));
  console.log("branded_auth:", authSession);

  await browser.close();
}

main().catch(console.error);
