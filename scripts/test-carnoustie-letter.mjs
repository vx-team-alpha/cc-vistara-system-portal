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

  const res = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const item = basket.currentItem;
    const contractId = item.contractId;
    const jobKey = item.jobKey;
    const itemKey = item.itemKey;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    async function setOption(itemObj, questionName, optionDescSubstring) {
      const q = itemObj.specification.find((q) =>
        q.name.toLowerCase().includes(questionName.toLowerCase()),
      );
      if (!q) throw new Error(`Question ${questionName} not found`);
      const opt = q.options.find((o) =>
        o.description.toLowerCase().includes(optionDescSubstring.toLowerCase()),
      );
      if (!opt)
        throw new Error(
          `Option ${optionDescSubstring} not found in ${q.name}: ${q.options.map((o) => o.description).join(", ")}`,
        );

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

    // Check door design question
    const doorDesignQ = item.specification.find((q) => q.name.includes("Door Design"));
    const currentDesign = doorDesignQ.options.find((o) => o.isCurrentOption);

    // Now select a specific door design first: Carnoustie
    const itemWithDesign = await setOption(item, "Door Design", "Carnoustie");

    // Now select Letterplate
    const itemWithLetter = await setOption(itemWithDesign, "Letterplate", "Letterplate");
    const letterQList = itemWithLetter.specification.filter((q) =>
      q.name.toLowerCase().includes("letter"),
    );

    return {
      initialDesign: currentDesign?.description,
      designOptionsCount: doorDesignQ.options.length,
      allDesigns: doorDesignQ.options.map((o) => o.description),
      letterQuestions: letterQList.map((q) => ({
        name: q.name,
        options: q.options.map((o) => ({ id: o.id, desc: o.description })),
      })),
    };
  });

  console.log("INITIAL DESIGN:", res.initialDesign);
  console.log("ALL DESIGNS COUNT:", res.designOptionsCount);
  console.log(
    "LETTER QUESTIONS AFTER SELECTING CARNOUSTIE + LETTERPLATE:\n",
    JSON.stringify(res.letterQuestions, null, 2),
  );

  await browser.close();
}

main().catch(console.error);
