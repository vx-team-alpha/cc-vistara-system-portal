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

  const dom = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll("svg")).map((s) => ({
      id: s.id,
      className: s.className?.baseVal || s.className,
      viewBox: s.getAttribute("viewBox"),
      innerHTMLPrefix: s.innerHTML.slice(0, 200),
      outerHTMLPrefix: s.outerHTML.slice(0, 200),
    }));

    const images = Array.from(document.querySelectorAll("img")).map((img) => ({
      src: img.src?.slice(0, 150),
      className: img.className,
    }));

    const basket = JSON.parse(sessionStorage.getItem("branded_basket") || "{}");

    return {
      svgCount: svgs.length,
      svgs,
      imagesCount: images.length,
      imagesSample: images.slice(0, 5),
      basketImageKeys: basket.currentItem?.images?.map((i) => Object.keys(i)),
      basketImages: basket.currentItem?.images,
    };
  });

  console.log("DOM inspection:\n", JSON.stringify(dom, null, 2));

  await browser.close();
}

main().catch(console.error);
