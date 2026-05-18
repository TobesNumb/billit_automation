import Anthropic from "@anthropic-ai/sdk";

export interface OrderLine {
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
    model: "claude-3-5-sonnet-20241022",
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
            text: `Dit is een handgeschreven dagrapport van een werknemer.
Extraheer alle projectregels als JSON array.
Elke regel heeft:
- projectNumber: string (bv. "P26-00879")
- from: string (bv. "03:30")
- to: string (bv. "07:00")
- description: string (activiteit/klant indien leesbaar, anders leeg)

Geef ENKEL een JSON array terug, geen uitleg. Voorbeeld:
[{"projectNumber":"P26-00879","from":"03:30","to":"07:00","description":""}]

Negeer de noot onderaan over extra uren tenzij er een projectnummer bij staat.`,
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
