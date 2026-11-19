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

  const test = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const item = basket.currentItem;
    const contractId = item.contractId;
    const jobKey = item.jobKey;
    const itemKey = item.itemKey;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    async function setOption(itemObj, questionName, optionDescSubstring) {
      const q = itemObj.specification.find(
        (q) => q.name.toLowerCase() === questionName.toLowerCase(),
      );
      if (!q) throw new Error(`Question ${questionName} not found`);
      const opt = q.options.find((o) =>
        o.description.toLowerCase().includes(optionDescSubstring.toLowerCase()),
      );
      if (!opt) throw new Error(`Option ${optionDescSubstring} not found in ${questionName}`);

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
            NewOptionId: opt.id,
            OnlyTheseComponents: (q.components || []).map((c) => c.id),
            Rule: 0,
          }),
        },
      );
      return res.json();
    }

    // Step 1: Select Letterplate -> Letterplate
    const item1 = await setOption(item, "Letterplate", "Letterplate");
    const letterPosQ = item1.specification.find((q) => q.name.includes("Letterplate Position"));

    // Step 2: Select Handle -> 1200 Inline Bar
    const item2 = await setOption(item1, "Handle", "Inline Bar");
    const escutcheonQ = item2.specification.find((q) => q.name.includes("Escutcheon"));

    // Step 3: Select Numeral -> Numerals
    const item3 = await setOption(item2, "Numeral", "Numerals");
    const houseNumQ = item3.specification.find(
      (q) => q.name.includes("House Number") || q.name.includes("Numeral"),
    );

    return {
      letterPos: {
        name: letterPosQ?.name,
        options: letterPosQ?.options.map((o) => ({ id: o.id, desc: o.description })),
      },
      escutcheon: {
        name: escutcheonQ?.name,
        options: escutcheonQ?.options.map((o) => ({ id: o.id, desc: o.description })),
      },
      houseNum: {
        name: houseNumQ?.name,
        options: houseNumQ?.options.map((o) => ({ id: o.id, desc: o.description })),
      },
    };
  });

  console.log("TEST RESULTS:\n", JSON.stringify(test, null, 2));

  await browser.close();
}

main().catch(console.error);
