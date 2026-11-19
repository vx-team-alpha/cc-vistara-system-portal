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

  const headers = {
    "content-type": "application/json",
    "x-quotila-app": "portal",
    referer: "https://doorco.portal.quotila.com/",
  };

  const post = async (endpoint, data) => {
    const res = await context.request.post(`${BASE}/${endpoint}`, { headers, data });
    if (!res.ok) throw new Error(`${endpoint} failed: ${res.status()} ${await res.text()}`);
    return res.json();
  };

  const proc = await post("processing/GetProcessingLevel", {});
  console.log("Processing level:", proc);

  const contractRes = await post("processing/UpdateContract", { ContractId: 0, NoSizes: true });
  const contractId = contractRes.contractId || contractRes.ContractId || contractRes.id;
  console.log("ContractId:", contractId);

  const jobRes = await post("processing/Job", {
    ContractId: contractId,
    JobKey: 1,
    Recalculate: false,
  });
  console.log("Job:", jobRes.id);

  // Door Left Hand is ProductStoredDesignId "e847f2dc-6e29-4eb7-814f-a5d434d571c0", ProductId: 966
  const item = await post("processing/CreateJobLineItem", {
    ContractId: contractId,
    JobKey: 1,
    ProductStoredDesignId: "e847f2dc-6e29-4eb7-814f-a5d434d571c0",
    ProductId: 966,
    ProcessingLevel: proc.processingLevelId,
  });

  console.log("Item created! Questions count:", item.specification?.length);
  console.log(
    "Questions:",
    item.specification?.map((q) => q.name),
  );

  // Let's inspect the "Door Design (Door)" question options
  const doorDesignQ = item.specification?.find((q) => q.name.includes("Door Design"));
  console.log("Door design options count:", doorDesignQ?.options?.length);
  console.log(
    "Sample door designs:",
    doorDesignQ?.options?.slice(0, 5).map((o) => ({ id: o.id, desc: o.description })),
  );

  await browser.close();
}

main().catch(console.error);
