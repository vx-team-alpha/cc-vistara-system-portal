const BASE = "https://doorco.server.quotila.com/api";

async function main() {
  console.log("1. Authenticate with VendorGuest...");
  const authRes = await fetch(`${BASE}/auth/VendorGuest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-quotila-app": "portal",
    },
    body: JSON.stringify({
      Alias: "nationwidecompositedoors",
      ReturnUrl: "http://www.google.com",
    }),
  });

  const authData = await authRes.json();
  const token = authData.token;
  console.log("Got token:", token.slice(0, 30) + "...");

  const headers = {
    "content-type": "application/json",
    "x-quotila-app": "portal",
    authorization: `Bearer ${token}`,
  };

  const post = async (endpoint, data = {}) => {
    const res = await fetch(`${BASE}/${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`${endpoint} failed: ${res.status} ${await res.text()}`);
    return res.json();
  };

  console.log("2. GetProcessingLevel...");
  const proc = await post("processing/GetProcessingLevel");
  console.log("Processing level:", proc);

  console.log("3. UpdateContract...");
  const contract = await post("processing/UpdateContract", { ContractId: 0, NoSizes: true });
  console.log("Contract ID:", contract.id);

  console.log("4. Job...");
  await post("processing/Job", { ContractId: contract.id, JobKey: 1, Recalculate: false });

  console.log("5. CreateJobLineItem...");
  // Door Left Hand is "e847f2dc-6e29-4eb7-814f-a5d434d571c0", ProductId 966
  const item = await post("processing/CreateJobLineItem", {
    ContractId: contract.id,
    JobKey: 1,
    ProductStoredDesignId: "e847f2dc-6e29-4eb7-814f-a5d434d571c0",
    ProductId: 966,
    ProcessingLevel: proc.processingLevelId,
  });

  console.log("Item created successfully! Spec questions count:", item.specification?.length);
  console.log(
    "Questions:",
    item.specification?.map((q) => q.name),
  );
}

main().catch(console.error);
