import type { BillitOrder } from "./transform.js";

const BILLIT_API_KEY = process.env.BILLIT_API_KEY!;
const BILLIT_PARTY_ID = process.env.BILLIT_PARTY_ID!;

export async function createInvoice(order: BillitOrder): Promise<string> {
  const res = await fetch("https://app.billit.be/api/orders", {
    method: "POST",
    headers: {
      Authorization: "apikey " + BILLIT_API_KEY,
      PartyID: BILLIT_PARTY_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Billit API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { OrderID: string };
  return data.OrderID;
}
