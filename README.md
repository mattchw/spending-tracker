# 💷 Spending Tracker

A private, self-hosted monthly expenditure dashboard for your UK bank accounts
(Lloyds, Barclays, HSBC, NatWest, Monzo, Starling, Revolut, …). It pulls
**money in / money out** automatically via [TrueLayer](https://truelayer.com)
(UK Open Banking) — no manual entry.

Everything runs locally. Your transactions live in a local SQLite file
(`data/spending.db`); nothing is sent anywhere except directly to TrueLayer.

---

## How it works

```
Your bank ──OAuth/SCA──► TrueLayer Data API ──► this app ──► SQLite ──► dashboard
```

You authorise each bank once. Consent lasts ~90 days (a UK Open Banking rule),
then you click **Connect a bank** again to re-connect. TrueLayer hosts the bank
picker, so you connect one bank at a time and they all aggregate into one view.

---

## One-time setup

### 1. Register a TrueLayer application (free)

1. Go to **https://console.truelayer.com** and sign up.
2. Create an application. Note its **Client ID** and **Client Secret**.
3. Switch to the **Live** environment (to read your real accounts) and make sure
   the **Data API** product is enabled.
4. Add this **Redirect URI**: `http://localhost:3000/api/callback`
   (TrueLayer allows `localhost`, so no public URL / tunnel is needed).

### 2. Wire it into the app

```bash
cp .env.local.example .env.local
```

- Set `TRUELAYER_CLIENT_ID` and `TRUELAYER_CLIENT_SECRET` in `.env.local`.
- Leave `APP_BASE_URL=http://localhost:3000` unless you run elsewhere.

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Connect a bank**, pick your bank and sign in
on TrueLayer's secure flow, and you'll be redirected back with your transactions
loaded. Repeat for each bank. Use **Sync now** any time to pull the latest.

> Prefer to try it without a real bank first? Set `TRUELAYER_AUTH_URL` /
> `TRUELAYER_API_URL` to the sandbox hosts (see `.env.local.example`) and use
> TrueLayer's sandbox test banks.

---

## Notes & limits (Open Banking rules, not app bugs)

- **~90-day history** on first connect; you build up more over time.
- **Re-consent every ~90 days** — just click **Connect a bank** again.
- **Read-only** — this can see transactions and balances, never move money.
- **Single currency** — totals sum raw amounts (no FX). Fine for all-GBP banks.
- **Categories** are rule-based; edit `src/lib/categorize.ts` to tune them.

## Layout

| Path | Purpose |
|------|---------|
| `src/lib/truelayer.ts` | TrueLayer OAuth + Data API client |
| `src/lib/db.ts` | SQLite schema + monthly aggregation |
| `src/lib/sync.ts` | Fetch + categorise + store transactions (token refresh) |
| `src/lib/categorize.ts` | Rule-based categorisation (edit me) |
| `src/app/api/*` | banks / connect / callback / sync / summary |
| `src/app/page.tsx` | Dashboard UI |
