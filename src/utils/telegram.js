import fetch from 'node-fetch';
import { log } from 'apify';

const API = 'https://api.telegram.org/bot';

export async function sendTelegramAlert({ botToken, chatId, tenders, runUrl }) {
    if (!botToken || !chatId || tenders.length === 0) return;

    const date   = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const header = `📋 *EU Tender Alert*\n${date} — ${tenders.length} new tender${tenders.length > 1 ? 's' : ''}\n\n`;
    const footer = runUrl ? `\n[📋 Full dataset](${runUrl})` : '';

    const lines = tenders.slice(0, 8).map(t => {
        const country  = t.country ? ` 🌍 ${esc(t.country)}` : '';
        const deadline = t.deadline ? ` | ⏰ ${t.deadline}` : '';
        const cpv      = t.cpv_description ? ` | ${esc(t.cpv_description)}` : '';
        return `• *${esc(t.notice_id)}*${country}${cpv}${deadline}\n  ${esc(t.title?.substring(0, 80) ?? 'No title')}\n  [TED](${t.ted_url})`;
    });

    let msg = header + lines.join('\n\n') + footer;
    if (msg.length > 3800) msg = msg.substring(0, 3750) + `\n_...truncated._${footer}`;

    try {
        const r = await fetch(`${API}${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true }),
            timeout: 10000,
        });
        if (!r.ok) log.warning('Telegram error', { status: r.status });
        else log.info(`Telegram: 1 summary sent (${tenders.length} tenders)`);
    } catch (err) {
        log.warning('Telegram failed', { error: err.message });
    }
}

function esc(t) { return String(t ?? '').replace(/[_*[\]()~`>#+=|{}.!-]/g, c => `\\${c}`); }