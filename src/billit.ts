import type { BillitOrder } from "./transform.js";

const BILLIT_API_KEY = process.env.BILLIT_API_KEY!;
const BILLIT_PARTY_ID = process.env.BILLIT_PARTY_ID!;

export async function createInvoice(order: BillitOrder): Promise<string> {
  const baseUrl = process.env.BILLIT_API_URL || "https://api.billit.be/v1";
  const url = `${baseUrl}/orders`;
  console.log(`Billit POST: ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "apikey " + BILLIT_API_KEY,
      PartyID: BILLIT_PARTY_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  const body = await res.text();
  console.log(`Billit response ${res.status}: ${body.slice(0, 500)}`);

  if (!res.ok) {
    throw new Error(`Billit API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = JSON.parse(body) as { OrderID: string };
  return data.OrderID;
}
