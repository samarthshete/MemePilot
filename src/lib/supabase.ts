import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * SERVER-ONLY Supabase client using the SERVICE-ROLE key (CLAUDE.md hard rule 1).
 * This key bypasses RLS, so it must never reach the browser — only our `/api/*`
 * routes (which verify the Privy token first) ever touch the DB. There is NO
 * client-side Supabase usage anywhere in this app.
 *
 * Supabase is OPTIONAL at runtime: if the env vars are unset the app still works
 * (on-chain holdings render; trades/positions/history are simply empty). Routes
 * check `isSupabaseConfigured()` and degrade gracefully.
 */
export type TradeSide = "buy" | "sell";

export interface TradeRow {
  id: string;
  privy_did: string;
  token_address: string;
  symbol: string | null;
  side: TradeSide;
  amount_usd: number | null;
  token_qty: number | null;
  price_at_trade: number | null;
  tx_signature: string | null;
  status: string | null;
  is_demo: boolean;
  created_at: string;
}

export type TradeInsert = Omit<TradeRow, "id" | "created_at">;

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabase() was called in the browser. The service-role client is server-only.",
    );
  }
  if (cached) return cached;
  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Best-effort cache of the user's profile (display fields only). Never throws. */
export async function upsertUser(row: {
  privy_did: string;
  wallet_address?: string | null;
  display_name?: string | null;
  email?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await getSupabase().from("users").upsert(
      {
        privy_did: row.privy_did,
        wallet_address: row.wallet_address ?? null,
        display_name: row.display_name ?? null,
        email: row.email ?? null,
      },
      { onConflict: "privy_did" },
    );
  } catch (err) {
    console.warn(`[supabase] upsertUser failed: ${(err as Error).message}`);
  }
}

/** Insert a trade row. Best-effort: NEVER throws (callers must not break the swap). */
export async function insertTrade(row: TradeInsert): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await getSupabase().from("trades").insert(row);
    if (error) {
      console.warn(`[supabase] insertTrade error: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[supabase] insertTrade threw: ${(err as Error).message}`);
    return false;
  }
}

/** Insert several trades at once (used by the demo seeder). Best-effort. */
export async function insertTrades(rows: TradeInsert[]): Promise<boolean> {
  if (!isSupabaseConfigured() || rows.length === 0) return false;
  try {
    const { error } = await getSupabase().from("trades").insert(rows);
    if (error) {
      console.warn(`[supabase] insertTrades error: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[supabase] insertTrades threw: ${(err as Error).message}`);
    return false;
  }
}

/** Does the user already have demo rows? (seed idempotency). */
export async function hasDemoTrades(privyDid: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data, error } = await getSupabase()
      .from("trades")
      .select("id")
      .eq("privy_did", privyDid)
      .eq("is_demo", true)
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Delete ONLY the user's demo rows. Real trades (is_demo=false) are untouched. */
export async function deleteDemoTrades(privyDid: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await getSupabase()
      .from("trades")
      .delete()
      .eq("privy_did", privyDid)
      .eq("is_demo", true);
    if (error) {
      console.warn(`[supabase] deleteDemoTrades error: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[supabase] deleteDemoTrades threw: ${(err as Error).message}`);
    return false;
  }
}

/** All trades for a user, newest first. Returns [] if unconfigured or on error. */
export async function getTrades(privyDid: string): Promise<TradeRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabase()
      .from("trades")
      .select("*")
      .eq("privy_did", privyDid)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn(`[supabase] getTrades error: ${error.message}`);
      return [];
    }
    return (data ?? []) as TradeRow[];
  } catch (err) {
    console.warn(`[supabase] getTrades threw: ${(err as Error).message}`);
    return [];
  }
}
