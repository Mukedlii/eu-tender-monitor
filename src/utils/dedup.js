import { log } from 'apify';

const KV_KEY = 'SEEN_TENDERS';

export async function deduplicateTenders(tenders, kvStore, deltaMode) {
    if (!deltaMode) return { newTenders: tenders, seenCount: 0 };

    let seen = new Set();
    try {
        const stored = await kvStore.getValue(KV_KEY);
        if (Array.isArray(stored)) seen = new Set(stored);
    } catch (err) {
        log.warning('Could not load seen tenders', { error: err.message });
    }

    const seenCount   = seen.size;
    const newTenders  = tenders.filter(t => !seen.has(t.notice_id));
    for (const t of newTenders) seen.add(t.notice_id);

    try {
        await kvStore.setValue(KV_KEY, [...seen].slice(-100000));
        log.info(`Tender history: ${seen.size} entries tracked`);
    } catch (err) {
        log.warning('Could not save tender history', { error: err.message });
    }

    return { newTenders, seenCount };
}