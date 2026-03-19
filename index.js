import { Telegraf } from "telegraf";

// 🌐 bot instance (هنعمله lazy)
let bot;

// ✅ Validate URL
function isValidUrl(text) {
  try { new URL(text); return true; } catch { return false; }
}

// 🔍 Get preview باستخدام fetch (مش axios)
async function getPreview(url) {
  const apiUrl = `https://link-preview-api.7assanosama.workers.dev/?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl);
  return await res.json();
}

// 🛡️ Rate Limit باستخدام KV
async function checkRateLimit(env, userId) {
  const key = `rate:${userId}`;
  const val = await env.USER_ATTEMPTS.get(key) || "0";

  if (parseInt(val) >= 3) return false;

  await env.USER_ATTEMPTS.put(key, (parseInt(val) + 1).toString(), {
    expirationTtl: 60
  });

  return true;
}

// 📝 Messages
const messages = {
  ar: {
    invalidUrl: "❌ لينك غير صالح",
    rateLimit: "⛔ وصلت للحد المسموح",
    loading: "⏳ جاري التحليل...",
    error: "❌ حصل خطأ",
    noTitle: "بدون عنوان",
    unknown: "غير معروف",
  },
  en: {
    invalidUrl: "❌ Invalid URL",
    rateLimit: "⛔ Rate limit exceeded",
    loading: "⏳ Analyzing...",
    error: "❌ Error occurred",
    noTitle: "No title",
    unknown: "Unknown",
  }
};

function getMsg(ctx, key) {
  const lang = ctx.from?.language_code?.startsWith("ar") ? "ar" : "en";
  return messages[lang][key] || messages.en[key];
}

// 🌐 Workers handler
export default {
  async fetch(request, env) {

    // ✅ init bot مرة واحدة
    if (!bot) {
      bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

      // 📩 Messages
      bot.on("text", async (ctx) => {
        const url = ctx.message.text.trim();
        const userId = ctx.from.id;

        if (!isValidUrl(url)) return ctx.reply(getMsg(ctx, "invalidUrl"));

        if (!(await checkRateLimit(env, userId))) {
          return ctx.reply(getMsg(ctx, "rateLimit"));
        }

        const loadingMsg = await ctx.reply(getMsg(ctx, "loading"));

        try {
          const data = await getPreview(url);

          await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

          const title = data.title || getMsg(ctx, "noTitle");
          const desc = data.description || "";
          const image = data.image;
          const site = data.site_name || data.domain || getMsg(ctx, "unknown");

          if (image) {
            return ctx.replyWithPhoto(image, {
              caption: `🔗 <b>${title}</b>\n🌍 ${site}\n\n${desc}`,
              parse_mode: "HTML",
            });
          }

          ctx.reply(
            `🔗 <b>${title}</b>\n🌍 ${site}\n\n${desc}`,
            { parse_mode: "HTML" }
          );

        } catch (err) {
          console.error(err);
          ctx.reply(getMsg(ctx, "error"));
        }
      });

      // 🔥 Inline
      bot.on("inline_query", async (ctx) => {
        const query = ctx.inlineQuery.query.trim();
        if (!isValidUrl(query)) return;

        try {
          const data = await getPreview(query);

          await ctx.answerInlineQuery([
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
            }
          ]);
        } catch (err) {
          console.error(err);
        }
      });
    }

    // 📡 Telegram webhook
    if (request.method === "POST") {
      const update = await request.json();
      return bot.handleUpdate(update);
    }

    return new Response("Bot is running 🚀");
  }
};