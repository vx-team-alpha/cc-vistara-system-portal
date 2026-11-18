const BASE = "https://doorco.server.quotila.com/api";

const headers = {
  "content-type": "application/json",
  "sec-ch-ua-platform": '"macOS"',
  referer: "https://doorco.portal.quotila.com/",
  "sec-ch-ua": '"Chromium";v="131"',
  "sec-ch-ua-mobile": "?0",
  "x-quotila-app": "portal",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

async function post(path, body = {}) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log("1. GetProcessingLevel");
  const proc = await post("processing/GetProcessingLevel");
  console.log("Processing level:", proc);

  console.log("2. VendorGuest");
  // Let's see what VendorGuest returns
  const guest = await post("auth/VendorGuest", { CompanyId: 2459 });
  console.log("Guest:", guest);

  console.log("3. UpdateContract");
  const contract = await post("processing/UpdateContract", { ContractId: 0, NoSizes: true });
  console.log("Contract:", contract);
}

main().catch(console.error);
