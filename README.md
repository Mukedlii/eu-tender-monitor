# 📋 EU Tender Monitor — TED Public Procurement Feed

**Monitor new European public procurement tenders from TED (Tenders Electronic Daily). Filter by keyword, country or CPV code. Get instant Telegram alerts on new contract opportunities worth billions of euros.**

> No API key needed. Uses official TED EU API. No proxy required.

---

## 🔍 What it does

TED is the supplement to the Official Journal of the EU dedicated to European public procurement — covering contracts from all EU Member States, EEA, and others. This actor monitors it daily so you never miss a relevant tender.

---

## ✅ Key features

- **Keyword filter** — track "software development", "IT consulting", "construction"
- **Country filter** — watch specific EU countries (DE, FR, HU, PL...)
- **CPV code filter** — target by procurement category (72=IT, 45=Construction...)
- **Delta mode** — only new tenders since last run
- **Telegram alerts** — 1 summary per run with country + deadline info
- **Webhook support** — Zapier, Make, n8n, Slack compatible
- **No API key needed** — anonymous TED API access

---

## 📦 Output fields

```json
{
  "notice_id": "123456-2025",
  "title": "Software development services for public administration",
  "publication_date": "20250415",
  "deadline": "20250530",
  "buyer_name": "Federal Ministry of Finance",
  "country": "DE",
  "region": "Berlin",
  "cpv_codes": ["72000000", "72200000"],
  "cpv_description": "IT services",
  "notice_type": "Contract notice",
  "contract_nature": "Services",
  "ted_url": "https://ted.europa.eu/en/notice/-/detail/123456-2025",
  "scraped_at": "2025-04-15T08:00:00.000Z"
}
```

---

## 🚀 Example configurations

### IT tenders across all EU
```json
{
  "keywords": ["software", "IT services", "digital transformation"],
  "cpv_codes": ["72000000"],
  "days_back": 7,
  "delta_mode": true
}
```

### Construction tenders in Germany + France
```json
{
  "countries": ["DE", "FR"],
  "cpv_codes": ["45000000"],
  "days_back": 7
}
```

### All tenders in Hungary
```json
{
  "countries": ["HU"],
  "days_back": 3,
  "max_results": 200
}
```

---

## 🌍 Supported countries

All EU member states + EEA: AT, BE, BG, CY, CZ, DE, DK, EE, ES, FI, FR, GR, HR, HU, IE, IT, LT, LU, LV, MT, NL, PL, PT, RO, SE, SI, SK + NO, IS, LI

---

## 📅 Recommended schedule

Daily at **09:00** — TED publishes new notices every working day.

---

## ⚡ Pricing

Pay-per-result.

| Volume | Est. cost |
|---|---|
| 50 tenders | ~$0.15 |
| 200 tenders | ~$0.60 |
| 500 tenders | ~$1.50 |

---

## 🎯 Use cases

- **B2B companies** — find contract opportunities in your sector
- **Consultants** — monitor relevant procurement for clients
- **Law firms** — track public procurement in specific sectors
- **Market research** — analyze EU spending trends by country/sector
- **Startups** — find government contracts to bid on