export default {
  async fetch(request, env) {
    const TELEGRAM_TOKEN = env.TELEGRAM_BOT_TOKEN;
    const TG_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

    // ✅ Handle webhook (POST from Telegram)
    if (request.method === "POST") {
      const update = await request.json();

      const message = update.message;
      const inlineQuery = update.inline_query;

      // 📩 Message handler
      if (message) {
        const chatId = message.chat.id;
        const text = message.text?.trim();

        // ✅ Validate URL
        if (!text || !isValidUrl(text)) {
          return sendMessage(TG_API, chatId, "❌ لينك غير صالح");
        }

        // ⏳ loading
        const loading = await sendMessage(TG_API, chatId, "⏳ جاري التحليل...");

        try {
          const data = await getPreview(text);

          // 🧹 delete loading
          await deleteMessage(TG_API, chatId, loading.result.message_id);

          const title = data.title || "No title";
          const desc = data.description || "";
          const image = data.image;
          const site = data.site_name || data.domain || "Unknown";

          if (image) {
            return sendPhoto(TG_API, chatId, image,
              `🔗 <b>${title}</b>\n🌍 ${site}\n\n${desc}`
            );
          }

          return sendMessage(
            TG_API,
            chatId,
            `🔗 <b>${title}</b>\n🌍 ${site}\n\n${desc}`
          );

        } catch (err) {
          console.error(err);
          return sendMessage(TG_API, chatId, "❌ حصل خطأ");
        }
      }

      // 🔥 Inline mode
      if (inlineQuery) {
        const query = inlineQuery.query.trim();

        if (!isValidUrl(query)) return new Response("ok");

        try {
          const data = await getPreview(query);

          const results = [
            {
              type: "article",
              id: "1",
              title: data.title || "Preview",
              description: data.description || "",
              input_message_content: {
                message_text: `🔗 <b>${data.title}</b>\n🌍 ${data.site_name || data.domain}`,
                parse_mode: "HTML",
              },
              thumb_url: data.image,
            },
          ];

          await fetch(`${TG_API}/answerInlineQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inline_query_id: inlineQuery.id,
              results,
              cache_time: 60,
            }),
          });

        } catch (err) {
          console.error(err);
        }
      }

      return new Response("ok");
    }

    return new Response("Bot is running 🚀");
  },
};

// ================== HELPERS ==================

function isValidUrl(text) {
  try { new URL(text); return true; } catch { return false; }
}

async function getPreview(url) {
  const api = `https://link-preview-api.7assanosama.workers.dev/?url=${encodeURIComponent(url)}`;
  const res = await fetch(api);
  return await res.json();
}

async function sendMessage(api, chatId, text) {
  const res = await fetch(`${api}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  return res.json();
}

async function sendPhoto(api, chatId, photo, caption) {
  return fetch(`${api}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      caption,
      parse_mode: "HTML",
    }),
  });
}

async function deleteMessage(api, chatId, messageId) {
  return fetch(`${api}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
}