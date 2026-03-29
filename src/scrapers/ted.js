/**
 * TED (Tenders Electronic Daily) API scraper
 *
 * Endpoint: https://api.ted.europa.eu/v3/notices/search
 * Auth: Anonymous access for published notices (no API key needed)
 * Docs: https://docs.ted.europa.eu/api/latest/index.html
 *
 * Search language: TED Query Language (TQL)
 * Example: TD=[1,2,3] AND PD>=[20250101] AND CPV=[72000000]
 */

import fetch from 'node-fetch';
import { log } from 'apify';

const TED_API = 'https://api.ted.europa.eu/v3/notices/search';

// Notice type codes:
// 1=Prior information, 2=Contract notice, 3=Contract award,
// 4=Periodic indicative notice, 7=Design contest notice
const CONTRACT_NOTICE_TYPES = [2, 3]; // contract notices + awards

export async function searchTenders({ keywords = [], countries = [], cpvCodes = [], daysBack = 7, maxResults = 100 }) {
    // DEBUG: Force 2025 December data (120 days back = ~Dec 1, 2025)
    const debugDaysBack = 120;
    const cutoff = formatDate(new Date(Date.now() - debugDaysBack * 24 * 60 * 60 * 1000));
    log.info(`EU Tender Monitor: searching tenders since ${cutoff} (DEBUG: forced ${debugDaysBack} days back for 2025 data)`);

    const query = buildTqlQuery({ keywords, countries, cpvCodes, cutoff });
    log.info(`TQL query: ${query}`);

    // TED API request schema is strict; avoid optional pagination keys that may break.
    const body = {
        query,
        fields: ['ND', 'TI', 'PD', 'DT', 'TD', 'NC', 'PR', 'RC', 'CY', 'AU'],
    };

    const res = await fetch(TED_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        timeout: 30000,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`TED API error ${res.status}: ${err.substring(0, 300)}`);
    }

    const data = await res.json();
    
    // DEBUG: Log raw API response structure
    log.info('TED raw response:', JSON.stringify(data, null, 2));
    log.info(`Response keys: ${Object.keys(data).join(', ')}`);
    log.info(`Total count field: ${data.totalCount ?? data.total ?? data.count ?? 'N/A'}`);
    
    const notices = data.notices ?? data.results ?? [];
    log.info(`Notices array length: ${notices.length}`);

    const tenders = notices.slice(0, maxResults).map(normalizeTender);
    log.info(`Found ${tenders.length} tenders`);
    return tenders;
}

function buildTqlQuery({ keywords, countries, cpvCodes, cutoff }) {
    const parts = [];

    // Date filter — published since cutoff (NO brackets - simple comparison)
    parts.push(`PD>=${cutoff}`);
    
    log.info(`DEBUG: Minimal query - ONLY date filter (cutoff: ${cutoff})`);
    
    /*
    // Notice type: contract notices only (TD=2 OR TD=3)
    const tdFilter = CONTRACT_NOTICE_TYPES.map(t => `TD=${t}`).join(' OR ');
    parts.push(`(${tdFilter})`);

    // Country filter
    if (countries.length > 0) {
        const cyFilter = countries.map(c => `CY=${c.toUpperCase()}`).join(' OR ');
        parts.push(`(${cyFilter})`);
    }

    // CPV code filter
    if (cpvCodes.length > 0) {
        const pcFilter = cpvCodes.map(c => `PC=${c}`).join(' OR ');
        parts.push(`(${pcFilter})`);
    }

    // Keyword filter — search in title
    if (keywords.length > 0) {
        const kwParts = keywords.map(kw => `TI~"${kw}"`);
        parts.push(`(${kwParts.join(' OR ')})`);
    }
    */

    return parts.join(' AND ');
}

function normalizeTender(n) {
    // TED API returns fields as arrays of objects with 'value'
    const get = (field) => {
        const v = n[field];
        if (!v) return null;
        if (Array.isArray(v)) return v.map(x => x.value ?? x).filter(Boolean).join(', ');
        return v.value ?? v;
    };

    const noticeId = get('ND') ?? n.noticeNumber ?? null;
    const pubDate  = get('PD') ?? n.publicationDate ?? null;
    const cpvRaw   = n['PC'];
    const cpvCodes = Array.isArray(cpvRaw) ? cpvRaw.map(x => x.value ?? x).filter(Boolean) : [];

    return {
        id:               `ted-${noticeId}`,
        notice_id:        noticeId,
        title:            get('TI') ?? null,
        publication_date: pubDate,
        deadline:         get('DT') ?? null,
        notice_type:      get('TD') ?? null,
        buyer_name:       get('AU') ?? null,
        country:          get('CY') ?? null,
        region:           get('RC') ?? null,
        cpv_codes:        cpvCodes.slice(0, 5),
        cpv_description:  cpvCodes[0] ? cpvCodeDescription(cpvCodes[0]) : null,
        contract_nature:  get('NC') ?? null,
        procedure_type:   get('PR') ?? null,
        award_criteria:   get('AC') ?? null,
        oj_supplement:    get('OJ_S') ?? null,
        ted_url:          noticeId ? `https://ted.europa.eu/en/notice/-/detail/${noticeId}` : null,
        scraped_at:       new Date().toISOString(),
    };
}

// Basic CPV top-level descriptions
function cpvCodeDescription(code) {
    const prefix = String(code).substring(0, 2);
    const map = {
        '03': 'Agricultural products', '09': 'Petroleum products',
        '14': 'Mining products', '15': 'Food products',
        '18': 'Clothing', '19': 'Leather goods',
        '22': 'Printed matter', '24': 'Chemical products',
        '30': 'Office machinery', '31': 'Electrical equipment',
        '32': 'Radio/TV equipment', '33': 'Medical equipment',
        '34': 'Transport equipment', '35': 'Security equipment',
        '37': 'Musical instruments', '38': 'Lab equipment',
        '39': 'Furniture', '41': 'Water',
        '42': 'Industrial machinery', '43': 'Mining machinery',
        '44': 'Construction materials', '45': 'Construction works',
        '48': 'Software', '50': 'Repair services',
        '51': 'Installation services', '55': 'Hotel services',
        '60': 'Transport services', '63': 'Logistics services',
        '64': 'Postal services', '65': 'Utilities',
        '66': 'Financial services', '67': 'Financial aux.',
        '70': 'Real estate', '71': 'Architecture services',
        '72': 'IT services', '73': 'R&D services',
        '75': 'Public admin', '76': 'Oil services',
        '77': 'Agricultural services', '79': 'Business services',
        '80': 'Education', '85': 'Health services',
        '90': 'Sewage services', '92': 'Recreation services',
        '98': 'Other community services',
    };
    return map[prefix] ?? null;
}

function formatDate(d) {
    return d.toISOString().split('T')[0].replace(/-/g, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }