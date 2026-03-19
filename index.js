import { Telegraf } from "telegraf";
import axios from "axios";

// 🌐 ضع توكن البوت هنا أو استخدم Secret في Cloudflare
const BOT_TOKEN = TELEGRAM_BOT_TOKEN; // secret environment variable
const bot = new Telegraf(BOT_TOKEN);

// ✅ Validate URL
function isValidUrl(text) {
  try { new URL(text); return true; } catch { return false; }
}

// 🔍 Get preview (يمكن إضافة caching باستخدام Workers KV لاحقًا)
async function getPreview(url) {
  const apiUrl = `https://link-preview-api.7assanosama.workers.dev/?url=${encodeURIComponent(url)}`;
  const { data } = await axios.get(apiUrl);
  return data;
}

// 🛡️ Limit attempts to 3 (في Workers ممكن تستخدم KV أو Durable Objects للحفظ الدائم)
const USER_ATTEMPTS = MY_KV_NAMESPACE; // معرف KV من wrangler.toml

async function checkRateLimit(userId) {
  const val = await USER_ATTEMPTS.get(userId) || "0";
  if (parseInt(val) >= 3) return false;
  await USER_ATTEMPTS.put(userId, (parseInt(val) + 1).toString(), { expirationTtl: 60 });
  return true;
}

// 📝 Messages (Ar/En)
const messages = {
  ar: {
    invalidUrl: "❌ لينك غير صالح",
    rateLimit: "⛔ لقد استنفذت جميع محاولاتك (3 محاولات فقط للنظام)",
    loading: "⏳ جاري التحليل...",
    error: "❌ حصل خطأ",
    noTitle: "بدون عنوان",
    unknown: "غير معروف",
    preview: "معاينة"
  },
  en: {
    invalidUrl: "❌ Invalid URL",
    rateLimit: "⛔ You have exhausted your 3 attempts",
    loading: "⏳ Analyzing...",
    error: "❌ An error occurred",
    noTitle: "No title",
    unknown: "Unknown",
    preview: "Preview"
  }
};

function getMsg(ctx, key) {
  const lang = ctx.from?.language_code?.startsWith("ar") ? "ar" : "en";
  return messages[lang][key] || messages.en[key];
}

// ⚡ Handle text messages
bot.on("text", async (ctx) => {
  const url = ctx.message.text.trim();
  const userId = ctx.from.id;

  if (!isValidUrl(url)) return ctx.reply(getMsg(ctx, "invalidUrl"));

  if (!(await checkRateLimit(userId))) return ctx.reply(getMsg(ctx, "rateLimit"));

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

    ctx.reply(`🔗 <b>${title}</b>\n🌍 ${site}\n\n${desc}`, { parse_mode: "HTML" });

  } catch (err) {
    console.error(err);
    ctx.reply(getMsg(ctx, "error"));
  }
});

// 🔥 Inline mode
bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  if (!isValidUrl(query)) return;

  try {
    const data = await getPreview(query);

    const title = data.title || getMsg(ctx, "noTitle");
    const site = data.site_name || data.domain || getMsg(ctx, "unknown");
    const previewText = data.title || getMsg(ctx, "preview");

    const results = [
      {
        type: "article",
        id: "1",
        title: previewText,
        description: data.description || "",
        input_message_content: {
          message_text: `🔗 <b>${title}</b>\n🌍 ${site}`,
          parse_mode: "HTML",
        },
        thumb_url: data.image,
      },
    ];

    await ctx.answerInlineQuery(results, { cache_time: 60 });

  } catch (err) {
    console.error(err);
  }
});

// 🌐 Workers fetch handler
export default {
  async fetch(request) {
    if (request.method === "POST") {
      const body = await request.json();
      return bot.handleUpdate(body);
    }
    return new Response("Bot is running!", { status: 200 });
  }
};