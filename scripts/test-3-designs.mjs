import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => console.log("[PAGE]", msg.text()));

  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  const res = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    let currentItem = basket.currentItem;
    const contractId = currentItem.contractId;
    const jobKey = currentItem.jobKey;
    const itemKey = currentItem.itemKey;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    async function setOption(questionName, optionId) {
      const q = currentItem.specification.find((q) =>
        q.name.toLowerCase().includes(questionName.toLowerCase()),
      );
      if (!q) throw new Error(`Question ${questionName} not found`);

      const res = await fetch(
        "https://doorco.server.quotila.com/api/processing/UpdateJobLineItemOption",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", "x-quotila-app": "portal" },
          body: JSON.stringify({
            ContractId: contractId,
            JobKey: jobKey,
            ItemKey: itemKey,
            ProcessingLevel: procLevel,
            OptionHeadingId: q.id || q.optionHeadingId,
            NewOptionId: optionId,
            OnlyTheseComponents: (q.components || []).map((c) => c.id),
            Rule: 0,
          }),
        },
      );
      currentItem = await res.json();
      return currentItem;
    }

    const doorDesignQ = currentItem.specification.find((q) => q.name.includes("Door Design"));
    const designs = doorDesignQ.options.slice(0, 3);
    const results = [];

    for (const d of designs) {
      console.log("Setting design:", d.description);
      await setOption("Door Design", d.id);

      const letterQ = currentItem.specification.find((q) => q.name.toLowerCase() === "letterplate");
      const letterOpt = letterQ?.options.find((o) => o.description.toLowerCase() === "letterplate");
      if (letterOpt) {
        console.log("Setting letterplate for", d.description);
        await setOption("Letterplate", letterOpt.id);
      }

      const posQ = currentItem.specification.find((q) =>
        q.name.toLowerCase().includes("letterplate position"),
      );
      results.push({
        design: d.description,
        positions: posQ?.options.map((o) => o.description) || [],
      });
    }

    return results;
  });

  console.log("Sequential 3 designs result:\n", JSON.stringify(res, null, 2));

  await browser.close();
}

main().catch(console.error);
