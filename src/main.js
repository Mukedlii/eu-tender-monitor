import { Actor, log } from 'apify';
import { searchTenders }      from './scrapers/ted.js';
import { deduplicateTenders } from './utils/dedup.js';
import { sendTelegramAlert }  from './utils/telegram.js';
import fetch from 'node-fetch';

await Actor.init();

const input = await Actor.getInput() ?? {};
const {
    keywords           = [],
    countries          = [],
    cpv_codes          = [],
    days_back          = 7,
    max_results        = 100,
    delta_mode         = true,
    telegram_bot_token = null,
    telegram_chat_id   = null,
    webhook_url        = null,
} = input;

if (!keywords.length && !countries.length && !cpv_codes.length) {
    log.warning('No filters set — returning all recent EU tenders. Consider adding keywords, countries or CPV codes.');
}

log.info('EU Tender Monitor starting', { keywords, countries, cpv_codes, days_back, max_results, delta_mode });

const dataset = await Actor.openDataset();
const kvStore = await Actor.openKeyValueStore();

// 1. Search TED
let tenders = [];
try {
    tenders = await searchTenders({ keywords, countries, cpvCodes: cpv_codes, daysBack: days_back, maxResults: max_results });
    log.info(`Found ${tenders.length} tenders`);
} catch (err) {
    log.error('TED search failed', { error: err.message });
    await Actor.exit(1);
}

if (tenders.length === 0) {
    log.info('No tenders found. Try broader keywords or more days_back.');
    await Actor.exit();
}

// 2. Deduplicate
const { newTenders, seenCount } = await deduplicateTenders(tenders, kvStore, delta_mode);
log.info(`Delta: ${tenders.length} total → ${newTenders.length} new (${seenCount} previously seen)`);

if (newTenders.length === 0) {
    log.info('No new tenders since last run.');
    await Actor.exit();
}

// 3. Save + charge
for (const t of newTenders) {
    await dataset.pushData(t);
    await Actor.charge({ eventName: 'result' });
}
log.info(`Saved ${newTenders.length} tenders to dataset`);

// 4. Telegram
if (telegram_bot_token && telegram_chat_id) {
    const runUrl = `https://console.apify.com/storage/datasets/${dataset.id}`;
    await sendTelegramAlert({ botToken: telegram_bot_token, chatId: telegram_chat_id, tenders: newTenders, runUrl });
} else {
    log.info('Telegram not configured — skipping alert.');
}

// 5. Webhook
if (webhook_url) {
    try {
        await fetch(webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp: new Date().toISOString(), new_tenders: newTenders.length, tenders: newTenders }),
            timeout: 15000,
        });
        log.info('Webhook delivered');
    } catch (err) {
        log.warning('Webhook failed', { error: err.message });
    }
}

log.info(`✅ Done. Saved: ${newTenders.length} tenders`);
await Actor.exit();