import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to design...");
  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  const debugResult = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const item = basket.currentItem;
    const contractId = item.contractId;
    const jobKey = item.jobKey;
    const itemKey = item.itemKey;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    const doorDesignQ = item.specification.find((q) => q.name.includes("Door Design"));
    console.log(
      "DoorDesignQ:",
      doorDesignQ.name,
      "id:",
      doorDesignQ.id,
      "headingId:",
      doorDesignQ.optionHeadingId,
    );

    // Pick second design
    const altDesign = doorDesignQ.options[1];

    const payload = {
      ContractId: contractId,
      JobKey: jobKey,
      ItemKey: itemKey,
      ProcessingLevel: procLevel,
      OptionHeadingId: doorDesignQ.id || doorDesignQ.optionHeadingId,
      NewOptionId: altDesign.id,
      OnlyTheseComponents: (doorDesignQ.components || []).map((c) => c.id),
      Rule: 0,
    };

    const updateRes = await fetch(
      "https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption",
      {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-quotila-app": "portal" },
        body: JSON.stringify(payload),
      },
    );

    const updateText = await updateRes.text();

    const getRes = await fetch("https://doorco.server.quotila.com/api/processing/JobLineItem", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-quotila-app": "portal" },
      body: JSON.stringify({
        ContractId: contractId,
        JobKey: jobKey,
        ItemKey: itemKey,
        ProcessingLevel: procLevel,
        Recalculate: false,
        FormatImagesForVisualiser: false,
      }),
    });

    const getText = await getRes.text();

    return {
      updateStatus: updateRes.status,
      updateTextLength: updateText.length,
      updateTextPreview: updateText.slice(0, 100),
      getStatus: getRes.status,
      getTextLength: getText.length,
      getTextPreview: getText.slice(0, 100),
    };
  });

  console.log("Debug result:", debugResult);

  await browser.close();
}

main().catch(console.error);
