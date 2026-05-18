import Anthropic from "@anthropic-ai/sdk";

export interface OrderLine {
  date: string;
  projectNumber: string;
  from: string;
  to: string;
  description: string;
}

const client = new Anthropic();

export async function extractOrderLines(
  base64: string,
  mediaType: string
): Promise<OrderLine[]> {
  console.log(`OCR: mediaType=${mediaType}, base64 length=${base64.length}`);
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: `Je ziet een foto van een handgeschreven dagrapport op een voorgedrukt formulier.
LET OP: de foto kan gedraaid of zijwaarts zijn. Draai het mentaal recht voordat je leest.

STAP 1 — Beschrijf eerst wat je ziet:
- Hoeveel ingevulde rijen zijn er in de tabel? (lege rijen niet meetellen)
- Wat staat er bij "DATUM:" bovenaan rechts? (formaat is dd/mm/yy of dd/mm/yyyy)
- Lees per ingevulde rij de kolommen van links naar rechts:
  * PROJECT: projectnummer (altijd formaat P25-XXXXX of P26-XXXXX, 5 cijfers na streepje)
  * KLANT/WERF: klantnaam (dit is GEEN projectnummer en GEEN tijd)
  * VAN: starttijd in uu:mm (24-uurs, bv 02:00, 05:00, 09:00)
  * TOT: eindtijd in uu:mm (altijd later dan VAN)
  * ACTIVITEIT: beschrijving

STAP 2 — Controleer jezelf:
- Is TOT altijd later dan VAN? (anders heb je kolommen verwisseld)
- Bevat het projectnummer exact 5 cijfers na het streepje?
- Heb je geen klantnamen als projectnummer gelezen?
- Is de datum realistisch? (jaar moet 2024, 2025 of 2026 zijn)

STAP 3 — Geef het resultaat als JSON array:
[{"date":"25/04/2026","projectNumber":"P26-00879","from":"02:00","to":"05:00","description":"Plaatsen"}]

Geef eerst je analyse (stap 1 en 2), en daarna de JSON array na "RESULT:".`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  console.log("OCR raw response:", text);
  const resultIdx = text.indexOf("RESULT:");
  const searchText = resultIdx >= 0 ? text.slice(resultIdx) : text;
  const jsonMatch = searchText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in Claude response");
  return JSON.parse(jsonMatch[0]) as OrderLine[];
}
