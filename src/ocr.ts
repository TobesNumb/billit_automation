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
    max_tokens: 1024,
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
            text: `Dit is een handgeschreven dagrapport in tabelvorm. Lees het zorgvuldig.

De tabel heeft deze kolommen (van links naar rechts):
1. PROJECT — projectnummer (formaat: P25-XXXXX of P26-XXXXX)
2. KLANT/WERF — klantnaam of werfnaam
3. VAN — starttijd (uu:mm formaat)
4. TOT — eindtijd (uu:mm formaat)
5. ACTIVITEIT — beschrijving van de activiteit

Bovenaan het formulier staat de DATUM (formaat dd/mm/yyyy of dd/mm/yy).

Extraheer:
- date: de datum bovenaan het formulier, altijd in formaat "dd/mm/yyyy"
- projectNumber: exact het projectnummer uit kolom 1 (bv. "P26-00879")
- from: starttijd uit kolom VAN (bv. "03:30")
- to: eindtijd uit kolom TOT (bv. "07:00")
- description: activiteit/klant indien leesbaar, anders leeg

BELANGRIJK:
- Lees kolommen apart. Verwar klantnamen niet met tijden.
- Projectnummers bevatten altijd 5 cijfers na het streepje (bv. P26-00879, niet P26-).
- Tijden zijn in 24-uurs formaat.
- Als een projectnummer onvolledig of onleesbaar is, geef dan wat leesbaar is.

Geef ENKEL een JSON array terug, geen uitleg. Voorbeeld:
[{"date":"16/05/2026","projectNumber":"P26-00879","from":"03:30","to":"07:00","description":""}]`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in Claude response");
  return JSON.parse(jsonMatch[0]) as OrderLine[];
}
