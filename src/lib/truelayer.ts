// TrueLayer Data API client (read-only Open Banking / AIS).
// Docs: https://docs.truelayer.com/docs/data-api-basics
//
// Flow:
//   1. Send the user to `authUrl()` — TrueLayer hosts the bank picker + SCA.
//   2. Bank redirects back with `?code=…`; exchange it via `exchangeCode()`.
//   3. Use the access token to read `listAccounts()` / `getTransactions()`.
//   4. Refresh with the long-lived refresh token (offline_access scope).

// "sandbox" uses TrueLayer's mock bank; "live" reads real accounts.
const SANDBOX = (process.env.TRUELAYER_ENV || "live").toLowerCase() === "sandbox";

// Env-appropriate defaults; explicit *_URL / PROVIDERS still override these.
const AUTH_BASE =
  process.env.TRUELAYER_AUTH_URL ||
  (SANDBOX ? "https://auth.truelayer-sandbox.com" : "https://auth.truelayer.com");
const API_BASE =
  process.env.TRUELAYER_API_URL ||
  (SANDBOX ? "https://api.truelayer-sandbox.com" : "https://api.truelayer.com");
const CLIENT_ID = process.env.TRUELAYER_CLIENT_ID || "";
const CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET || "";

// `offline_access` is required to receive a refresh token for background sync.
const SCOPE = "info accounts balance cards transactions offline_access";
// Space-separated provider groups. Sandbox uses the mock bank; live uses UK banks.
const PROVIDERS =
  process.env.TRUELAYER_PROVIDERS ||
  (SANDBOX ? "uk-cs-mock" : "uk-ob-all uk-oauth-all");

export function isConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/** Build the hosted-auth URL. TrueLayer shows its own bank chooser here. */
export function authUrl(redirectUrl: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPE,
    redirect_uri: redirectUrl,
    providers: PROVIDERS,
    state,
  });
  return `${AUTH_BASE}/?${params.toString()}`;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function token(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(`${AUTH_BASE}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      ...body,
    }),
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = json?.error_description || json?.error || res.statusText;
    throw new Error(`TrueLayer auth ${res.status}: ${msg}`);
  }
  return json as TokenSet;
}

/** Exchange an authorization `code` for access + refresh tokens. */
export function exchangeCode(
  code: string,
  redirectUrl: string,
): Promise<TokenSet> {
  return token({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUrl,
  });
}

/** Swap a refresh token for a fresh access token. */
export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return token({ grant_type: "refresh_token", refresh_token: refreshToken });
}

async function apiGet<T = any>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = json?.error_description || json?.error || res.statusText;
    throw new Error(`TrueLayer ${res.status}: ${msg}`);
  }
  return json as T;
}

export interface TlAccount {
  uid: string;
  name: string;
  provider: string;
  logo: string | null;
  currency: string;
  iban: string | null;
  kind: "account" | "card";
}

interface RawAccount {
  account_id: string;
  display_name?: string;
  currency?: string;
  account_number?: { iban?: string };
  provider?: { display_name?: string; logo_uri?: string };
}

interface RawCard {
  account_id: string;
  display_name?: string;
  card_network?: string;
  partial_card_number?: string;
  name_on_card?: string;
  currency?: string;
  provider?: { display_name?: string; logo_uri?: string };
}

/** Bank (current/savings) accounts on the connection. */
export async function listAccounts(accessToken: string): Promise<TlAccount[]> {
  const data = await apiGet<{ results?: RawAccount[] }>(
    "/data/v1/accounts",
    accessToken,
  );
  return (data.results || []).map((a) => ({
    uid: a.account_id,
    name: a.display_name || "Account",
    provider: a.provider?.display_name || "Bank",
    logo: a.provider?.logo_uri || null,
    currency: a.currency || "GBP",
    iban: a.account_number?.iban || null,
    kind: "account" as const,
  }));
}

/** Credit / charge cards on the connection (may be empty or unsupported). */
export async function listCards(accessToken: string): Promise<TlAccount[]> {
  try {
    const data = await apiGet<{ results?: RawCard[] }>(
      "/data/v1/cards",
      accessToken,
    );
    return (data.results || []).map((c) => ({
      uid: c.account_id,
      name:
        c.display_name ||
        [c.card_network, c.partial_card_number].filter(Boolean).join(" ") ||
        "Card",
      provider: c.provider?.display_name || "Card",
      logo: c.provider?.logo_uri || null,
      currency: c.currency || "GBP",
      iban: null,
      kind: "card" as const,
    }));
  } catch {
    // Not all connections expose cards; treat as none rather than failing.
    return [];
  }
}

export interface TlBalance {
  current: number;
  available: number | null;
  currency: string;
}

/** Current balance for an account or card (null if unavailable). */
export async function getBalance(
  accessToken: string,
  accountUid: string,
  kind: "account" | "card",
): Promise<TlBalance | null> {
  const base = kind === "card" ? "cards" : "accounts";
  try {
    const data = await apiGet<{
      results?: {
        current?: number;
        available?: number;
        currency?: string;
      }[];
    }>(`/data/v1/${base}/${accountUid}/balance`, accessToken);
    const b = data.results?.[0];
    if (!b || typeof b.current !== "number") return null;
    return {
      current: b.current,
      available: typeof b.available === "number" ? b.available : null,
      currency: b.currency || "GBP",
    };
  } catch {
    return null;
  }
}

export interface TlTransaction {
  transaction_id?: string;
  timestamp?: string;
  description?: string;
  merchant_name?: string;
  amount: number;
  currency: string;
  transaction_type?: "DEBIT" | "CREDIT";
  transaction_category?: string;
}

/**
 * Settled transactions for an account/card between two YYYY-MM-DD dates.
 * `kind` selects the accounts vs cards endpoint.
 */
export async function getTransactions(
  accessToken: string,
  accountUid: string,
  kind: "account" | "card",
  from: string,
  to: string,
): Promise<TlTransaction[]> {
  const base = kind === "card" ? "cards" : "accounts";
  const params = new URLSearchParams({ from, to });
  const data = await apiGet<{ results?: TlTransaction[] }>(
    `/data/v1/${base}/${accountUid}/transactions?${params.toString()}`,
    accessToken,
  );
  return data.results || [];
}
