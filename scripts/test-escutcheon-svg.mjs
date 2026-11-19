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

  // Select 1200 Inline Bar Handle
  await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const item = basket.currentItem;
    const handleQ = item.specification.find((q) => q.name.toLowerCase() === "handle");
    const barOpt = handleQ.options.find((o) => o.description.includes("Inline Bar"));

    await fetch("https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-quotila-app": "portal" },
      body: JSON.stringify({
        ContractId: item.contractId,
        JobKey: item.jobKey,
        ItemKey: item.itemKey,
        ProcessingLevel: 306,
        OptionHeadingId: handleQ.id || handleQ.optionHeadingId,
        NewOptionId: barOpt.id,
        OnlyTheseComponents: (handleQ.components || []).map((c) => c.id),
        Rule: 0,
      }),
    });
  });

  await page.reload();
  await page.waitForTimeout(4000);

  const images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("svg image"));
    return imgs.map((img) => ({
      href: img.getAttribute("href") || img.getAttributeNS("http://www.w3.org/1999/xlink", "href"),
      x: img.getAttribute("x"),
      y: img.getAttribute("y"),
      width: img.getAttribute("width"),
      height: img.getAttribute("height"),
    }));
  });

  console.log("Images on SVG with Inline Bar Handle:\n", JSON.stringify(images, null, 2));

  await browser.close();
}

main().catch(console.error);
