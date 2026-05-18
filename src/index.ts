import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { extractOrderLines } from "./ocr.js";
import { buildBillitOrder } from "./transform.js";
import { createInvoice } from "./billit.js";
import {
  sendMessage,
  getFileUrl,
  setWebhook,
  type TelegramUpdate,
} from "./telegram.js";

const app = new Hono();

async function processReport(base64: string, mediaType: string, date: string) {
  const lines = await extractOrderLines(base64, mediaType);
  if (lines.length === 0) throw new Error("Geen orderlijnen gevonden");
  const order = buildBillitOrder(lines, date);
  const orderId = await createInvoice(order);
  return { orderId, lineCount: lines.length, lines };
}

function formatConfirmation(
  orderId: string,
  lineCount: number,
  lines: { projectNumber: string; from: string; to: string }[]
): string {
  const header = `✅ Factuur aangemaakt\nBillit OrderID: ${orderId}\n${lineCount} orderlijnen:\n`;
  const details = lines
    .map((l) => `• ${l.projectNumber} ${l.from}–${l.to}`)
    .join("\n");
  return header + details;
}

app.get("/health", (c) => c.json({ ok: true }));

app.post("/webhook", async (c) => {
  try {
    const update: TelegramUpdate = await c.req.json();
    const message = update.message;
    if (!message) return c.json({ ok: true });

    const chatId = message.chat.id;

    if (message.text === "/start") {
      await sendMessage(
        chatId,
        "📋 Stuur een foto van een handgeschreven dagrapport.\nIk maak er automatisch een Billit factuur van."
      );
      return c.json({ ok: true });
    }

    const photo = message.photo;
    const document = message.document;

    if (!photo && !document) {
      await sendMessage(chatId, "Stuur een foto of afbeelding van het dagrapport.");
      return c.json({ ok: true });
    }

    await sendMessage(chatId, "⏳ Dagrapport verwerken...");

    let fileId: string;
    let mediaType = "image/jpeg";

    if (photo) {
      fileId = photo[photo.length - 1].file_id;
    } else {
      fileId = document!.file_id;
      mediaType = document!.mime_type || "image/jpeg";
    }

    const { base64, contentType } = await getFileUrl(fileId);
    const date = new Date().toISOString().slice(0, 10);

    const result = await processReport(base64, contentType || mediaType, date);
    const confirmation = formatConfirmation(
      result.orderId,
      result.lineCount,
      result.lines
    );
    await sendMessage(chatId, confirmation);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errDetail = err && typeof err === "object" && "status" in err
      ? `[${(err as { status: number }).status}] ${errMsg}`
      : errMsg;
    console.error("Processing failed:", errDetail, err);
    try {
      const update: TelegramUpdate = await c.req.json();
      const chatId = update.message?.chat?.id;
      if (chatId) {
        await sendMessage(chatId, `❌ Fout: ${errDetail}`);
      }
    } catch {}
  }

  return c.json({ ok: true });
});

app.get("/setup-webhook", async (c) => {
  const host = process.env.RAILWAY_PUBLIC_DOMAIN || c.req.header("host");
  if (!host) return c.json({ error: "No host found" }, 400);
  const url = `https://${host}/webhook`;
  const result = await setWebhook(url);
  return c.json({ ok: true, webhookUrl: url, telegram: result });
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`dagrapport-processor running on port ${port}`);
});
