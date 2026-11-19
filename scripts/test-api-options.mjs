import { chromium } from "playwright";

const LAUNCH = "https://doorco.portal.quotila.com/launch/nationwidecompositedoors";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(LAUNCH);
  await page.waitForSelector("text=Start Designing", { timeout: 20000 });
  await page.click("text=Start Designing");

  await page.waitForSelector("text=Standard foam filled composite doors", { timeout: 20000 });
  await page.click("text=Standard foam filled composite doors");

  await page.waitForSelector("button:has-text('Door Left Hand')", { timeout: 20000 });
  await page.click("button:has-text('Door Left Hand')");

  await page.waitForURL(/\/design\//, { timeout: 30000 });
  await page.waitForTimeout(3000);

  const testResults = await page.evaluate(async () => {
    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");
    const contractId = basket.contractIdentifier?.[0]?.contractId || basket.currentItem?.contractId;
    const jobKey = basket.contractIdentifier?.[0]?.jobKey || basket.currentItem?.jobKey || 1;
    const itemKey = basket.currentItem?.itemKey || 1;
    const auth = JSON.parse(sessionStorage.getItem("branded_auth") || "{}");
    const procLevel = auth.processingLevel || 306;

    async function setOptionAndGetItem(optionHeadingId, newOptionId, components = []) {
      const updateRes = await fetch(
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
            OptionHeadingId: optionHeadingId,
            NewOptionId: newOptionId,
            OnlyTheseComponents: components,
            Rule: 0,
          }),
        },
      );
      if (!updateRes.ok) {
        throw new Error(`UpdateJobLineItemOption failed: ${updateRes.status}`);
      }

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
      return getRes.json();
    }

    const currentItem = basket.currentItem;

    // 1. Select Letterplate -> Letterplate
    const letterQ = currentItem.specification.find((q) => q.name === "Letterplate");
    const letterplateOpt = letterQ.options.find((o) => o.description === "Letterplate");
    const compIds = (letterQ.components || []).map((c) => c.id);
    const itemWithLetter = await setOptionAndGetItem(
      letterQ.id || letterQ.optionHeadingId,
      letterplateOpt.id,
      compIds,
    );
    const letterPosQ = itemWithLetter.specification.find((q) =>
      q.name.includes("Letterplate Position"),
    );

    // 2. Select Handle -> 1200 Inline Bar Handle
    const handleQ = itemWithLetter.specification.find((q) => q.name === "Handle");
    const inlineOpt = handleQ?.options.find((o) => o.description.includes("Inline Bar"));
    let itemWithHandle = null;
    let escutcheonQ = null;
    if (inlineOpt) {
      itemWithHandle = await setOptionAndGetItem(
        handleQ.id || handleQ.optionHeadingId,
        inlineOpt.id,
        (handleQ.components || []).map((c) => c.id),
      );
      escutcheonQ = itemWithHandle.specification.find((q) => q.name.includes("Escutcheon"));
    }

    // 3. Select Numeral -> Numerals
    const numeralQ = (itemWithHandle || itemWithLetter).specification.find(
      (q) => q.name === "Numeral",
    );
    const numeralsOpt = numeralQ?.options.find((o) => o.description === "Numerals");
    let itemWithNumeral = null;
    let numberQuestions = [];
    if (numeralsOpt) {
      itemWithNumeral = await setOptionAndGetItem(
        numeralQ.id || numeralQ.optionHeadingId,
        numeralsOpt.id,
        (numeralQ.components || []).map((c) => c.id),
      );
      numberQuestions = itemWithNumeral.specification.filter(
        (q) => q.name.includes("Number") || q.name.includes("Numeral"),
      );
    }

    // 4. Select Cill -> 155mm Cill
    const cillQ = (itemWithNumeral || itemWithHandle || itemWithLetter).specification.find(
      (q) => q.name === "Cill",
    );
    const cill155Opt = cillQ?.options.find((o) => o.description.includes("155mm"));
    let itemWithCill = null;
    if (cill155Opt) {
      itemWithCill = await setOptionAndGetItem(
        cillQ.id || cillQ.optionHeadingId,
        cill155Opt.id,
        (cillQ.components || []).map((c) => c.id),
      );
    }

    return {
      designName: currentItem.specification
        .find((q) => q.name.includes("Door Design"))
        ?.options?.find((o) => o.isCurrentOption)?.description,
      letterplatePositions: letterPosQ
        ? {
            name: letterPosQ.name,
            options: letterPosQ.options.map((o) => ({
              id: o.id,
              desc: o.description,
              current: o.isCurrentOption,
            })),
          }
        : null,
      handleSelected: inlineOpt?.description,
      escutcheon: escutcheonQ
        ? {
            name: escutcheonQ.name,
            options: escutcheonQ.options.map((o) => ({
              id: o.id,
              desc: o.description,
              current: o.isCurrentOption,
            })),
          }
        : null,
      numberQuestions: numberQuestions.map((q) => ({
        name: q.name,
        options: q.options?.map((o) => ({
          id: o.id,
          desc: o.description,
          textEntry: o.textEntry,
          current: o.isCurrentOption,
        })),
      })),
      cillOptions: cillQ?.options?.map((o) => o.description),
      cillChosen: cill155Opt?.description,
      cillImagesCount: itemWithCill?.images?.length,
      cillSimpleComponents: itemWithCill?.simpleComponents?.filter((c) =>
        /cill/i.test(c.description || ""),
      ),
      cillItemDimensions: itemWithCill?.dimensions,
    };
  });

  console.log("ACCURATE OPTION FLOW RESULTS:\n", JSON.stringify(testResults, null, 2));

  await browser.close();
}

main().catch(console.error);
