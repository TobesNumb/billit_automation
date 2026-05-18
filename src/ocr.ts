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

KRITISCH — PROJECTNUMMERS STAAN OP 2 REGELS:
Het projectnummer wordt ALTIJD over 2 handgeschreven regels geschreven:
  Regel 1: "P26-"
  Regel 2: "00509"
Dit is ÉÉN projectnummer: P26-00509. NIET twee aparte rijen!
Het formaat is altijd: P + 2 cijfers + streepje + 5 cijfers (bv. P25-03888, P26-00509, P26-01237).

STAP 1 — Beschrijf wat je ziet:
- Wat staat er bij "DATUM:" op het formulier? (formaat dd/mm/yy of dd/mm/yyyy)
- Tel het aantal UNIEKE tijdblokken in de VAN/TOT kolommen. Dat is het echte aantal rijen.
- Lees per rij de kolommen:
  * PROJECT: combineer de 2 regels tot één projectnummer (P2X-XXXXX)
  * KLANT/WERF: klantnaam (dit is GEEN projectnummer en GEEN tijd)
  * VAN: starttijd in HH:MM (24-uurs)
  * TOT: eindtijd in HH:MM (altijd later dan VAN)
  * ACTIVITEIT: beschrijving

STAP 2 — Controleer:
- Is TOT altijd later dan VAN? (anders kolommen verwisseld)
- Heeft elk projectnummer exact formaat P2X-XXXXX (5 cijfers)?
- Klopt het aantal rijen met het aantal unieke tijdblokken?
- Zijn er geen dubbele rijen door het 2-regelig projectnummer?

STAP 3 — JSON array na "RESULT:":
[{"date":"25/04/2026","projectNumber":"P26-00509","from":"05:00","to":"08:00","description":""}]`,
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
