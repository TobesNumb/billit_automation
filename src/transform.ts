import type { OrderLine } from "./ocr.js";

export interface BillitOrderLine {
  Description: string;
  UnitPrice: number;
  Quantity: number;
  VatPercentage: number;
}

export interface BillitOrder {
  OrderType: string;
  OrderDirection: string;
  OrderNumber: string;
  OrderDate: string;
  DeliveryDate: string;
  ExpiryDate: string;
  Customer: {
    Name: string;
    VATNumber: string;
    PartyType: string;
    Language: string;
    Addresses: {
      AddressType: string;
      Street: string;
      StreetNumber: string;
      City: string;
      Zipcode: string;
      CountryCode: string;
    }[];
  };
  OrderLines: BillitOrderLine[];
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}u${m.toString().padStart(2, "0")}` : `${h}u00`;
}

function formatDateDDMMYYYY(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildBillitOrder(
  lines: OrderLine[],
  date: string
): BillitOrder {
  const displayDate = formatDateDDMMYYYY(date);

  const orderLines: BillitOrderLine[] = lines.map((line) => {
    const minutes = parseTime(line.to) - parseTime(line.from);
    const hours = Math.round((minutes / 60) * 100) / 100;
    const duration = formatDuration(minutes);

    return {
      Description: `${displayDate} | ${line.projectNumber} | ${line.from} | ${line.to} | ${duration}`,
      UnitPrice: 40.0,
      Quantity: hours,
      VatPercentage: 21,
    };
  });

  return {
    OrderType: "Invoice",
    OrderDirection: "Income",
    OrderNumber: "AUTO-" + Date.now(),
    OrderDate: date,
    DeliveryDate: date,
    ExpiryDate: addDays(date, 7),
    Customer: {
      Name: "Fero Group NV",
      VATNumber: "BE0875843187",
      PartyType: "Customer",
      Language: "NL",
      Addresses: [
        {
          AddressType: "InvoiceAddress",
          Street: "Jozef De Blockstraat",
          StreetNumber: "81",
          City: "Willebroek",
          Zipcode: "2830",
          CountryCode: "BE",
        },
      ],
    },
    OrderLines: orderLines,
  };
}
