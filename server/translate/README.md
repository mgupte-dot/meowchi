# Meowchi translation service

A small Cloudflare Worker that lets the Meowchi app get Claude-written translations.
The app sends its sound analysis to the Worker, the Worker asks Claude for one line, and sends it back.
Your Anthropic API key stays in the Worker. It is never in the app.

Everything below is done in a browser. No command line.

## 1. Get an Anthropic API key

1. Sign in at https://platform.claude.com and add a small amount of credit under Settings > Billing.
2. Leave auto-reload off. With prepaid credit and no auto-reload, the most this can ever cost is the credit you bought.
3. Create an API key (Settings > API keys) and copy it.

## 2. Create the Worker

1. Sign up at https://dash.cloudflare.com (the free plan is enough).
2. Go to Workers & Pages > Create > Create Worker. Name it `meowchi-translate` and deploy the starter.
3. Click Edit code, delete what's there, paste in all of `worker.js`, and click Deploy.

## 3. Add the settings

In the Worker, open Settings > Variables and Secrets and add:

| Name | Type | Value |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Secret | the key from step 1 |
| `ALLOWED_ORIGINS` | Text | your app's address, e.g. `https://your-site.netlify.app` |

`ALLOWED_ORIGINS` limits which websites can use the service. Separate several with commas.
If you leave it out, any website can call it, which is fine for a first test but not for sharing.

Optional, all Text: `PER_MINUTE` (default 6), `PER_DAY` (default 40) per visitor, `DAILY_CAP` (default 1000) for everyone combined,
`MODEL` (default `claude-haiku-5-5`).

## 4. Check it

Open the Worker's address (`https://meowchi-translate.<your-name>.workers.dev`) in a browser.
You should see `{"service":"meowchi-translate","ready":true}`. If `ready` is false, the key isn't set.

## 5. Point the app at it

In the app folder, open `config.js` and put the Worker's address between the quotes:

    window.MEOWCHI_TRANSLATE_URL = "https://meowchi-translate.<your-name>.workers.dev";

Upload the app folder again. Results will now show "Translation written by Claude".
If the service is slow, over its limit, or down, the app quietly uses its built-in lines.

## What it costs

Each translation is one short request to Claude Haiku 5.5 (about 400 tokens in, 40 out).
At the published price of $0.10 per million input tokens and $0.50 per million output tokens, that is roughly
$0.00006 each, so about $1 per 15,000 translations. Check current prices at
https://platform.claude.com/docs/en/about-claude/pricing. Cloudflare's free plan covers 100,000 Worker requests a day.

## How the limits work

- Each visitor gets 6 translations a minute and 40 a day. Everyone combined gets 1,000 a day.
- The Worker only accepts a Meowchi analysis in the exact shape the app sends, so the address can't be used as a free general Claude service.
- The counters are kept in the Worker's memory. Cloudflare runs many copies of a Worker, so the counts are a strong speed bump, not exact.
  For an exact daily cap, create a KV namespace (Storage & Databases > KV) and bind it to the Worker with the variable name `LIMITS`.
- Visitor limits go by IP address, so people on the same network share one allowance.
- Your real ceiling is the prepaid credit from step 1.

## Privacy

The Worker receives the measurements (sound type, pitch, length, loudness, setting, likely needs), never the recording.
It stores nothing. Mention this in your privacy policy before a public launch.
