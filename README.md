# UltraFastWebScraper_bot
Telegram Bot for Ultra Fast Link Preview Web Scraper API

A lightning-fast Telegram bot built with [Telegraf](https://telegraf.js.org/) and designed to run on **Cloudflare Workers**. The bot takes any valid URL and returns a rich preview (title, description, image, and site name) using a custom Link Preview API.

## Features
- **Bilingual Support**: Automatically replies in Arabic (`ar`) or English (`en`) based on the user's Telegram language settings.
- **Link Previews**: Fetches metadata (title, description, and image) for URLs.
- **Inline Mode**: Supports inline queries allowing you to get link previews in any chat.
- **Rate Limiting**: Restricts users to exactly 3 attempts in total (per running memory isolate) to prevent abuse.
- **Cloudflare Workers**: Optimized to run at the edge for maximum speed and zero server maintenance.

## Prerequisites
- [Node.js](https://nodejs.org/) installed locally (if running outside Workers during dev).
- A [Cloudflare](https://dash.cloudflare.com/) account.
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI installed globally.
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather).

## Setup & Deployment

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Secrets:**
   You will need to add your Telegram Bot Token to Cloudflare Workers as a secret:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```

3. **Deploy to Cloudflare Workers:**
   ```bash
   npx wrangler deploy
   ```

4. **Set Webhook:**
   After deploying, you need to set your bot's webhook to the Cloudflare Worker URL.
   Send a GET request to:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>
   ```

## Development
The bot uses a custom proxy API (`https://link-preview-api.7assanosama.workers.dev/`) to generate the link previews quickly.

To test locally, you can use:
```bash
npx wrangler dev
```
*(Note: Webhooks might not naturally reach your localhost without a tunnel like Ngrok or Cloudflare Tunnels).*

## License
MIT
