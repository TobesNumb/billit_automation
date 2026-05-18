const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    photo?: { file_id: string; width: number; height: number }[];
    document?: { file_id: string; mime_type?: string; file_name?: string };
  };
}

export async function sendMessage(
  chatId: number,
  text: string
): Promise<void> {
  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage ${res.status}: ${body}`);
  }
}

export async function getFileUrl(
  fileId: string
): Promise<{ base64: string; contentType: string }> {
  const res = await fetch(`${API}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  if (!res.ok) throw new Error(`Telegram getFile ${res.status}`);

  const data = (await res.json()) as {
    result: { file_path: string };
  };
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;

  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Telegram file download ${fileRes.status}`);

  const buffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const filePath = data.result.file_path;
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  const contentType = mimeMap[ext || ""] || "image/jpeg";

  return { base64, contentType };
}

export async function setWebhook(
  url: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return (await res.json()) as Record<string, unknown>;
}
