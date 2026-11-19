import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function dismissCookie(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[class*="Cookie"], [class*="cookie"]').forEach((e) => e.remove());
    Array.from(document.querySelectorAll("div"))
      .filter((d) => (d.innerText || "").includes("Cookie Notice"))
      .forEach((d) => d.remove());
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to launch...");
  await page.goto(LAUNCH, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await dismissCookie(page);

  await page
    .getByRole("button", { name: /Start Designing/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await dismissCookie(page);

  await page.getByText("Standard foam filled composite doors").first().click();
  await page.waitForTimeout(1500);
  await dismissCookie(page);

  await page.getByRole("button", { name: "Door Left Hand", exact: true }).first().click();
  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);
  await dismissCookie(page);

  console.log("At design page!");

  // Call UpdateJobLineItemOption from inside page.evaluate
  const result = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const item = basket.currentItem || {};
    const contractId = basket.contractIdentifier || basket.job?.contractId || item.contractId;
    const jobKey = basket.job?.jobKey || item.jobKey || 1;
    const itemKey = item.itemKey || 1;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    const doorDesignQ = (item.specification || []).find((q) => q.name.includes("Door Design"));
    const belfryOpt = doorDesignQ?.options?.find((o) => o.description === "Belfry Farmhouse");

    const res = await fetch(
      "https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-quotila-app": "portal",
        },
        body: JSON.stringify({
          ContractId: contractId,
          JobKey: jobKey,
          ItemKey: itemKey,
          OptionHeadingId: doorDesignQ.id || doorDesignQ.optionHeadingId,
          OptionId: belfryOpt.id,
          ProcessingLevel: procLevel,
        }),
      },
    );

    const json = await res.json();
    return {
      status: res.status,
      specificationNames: (json.specification || []).map((q) => q.name),
      specCount: json.specification?.length,
    };
  });

  console.log("UpdateJobLineItemOption result:", result);

  await browser.close();
}

main().catch(console.error);
