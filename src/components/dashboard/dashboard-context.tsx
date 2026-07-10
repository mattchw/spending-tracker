"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import type { SummaryResp } from "@/lib/types";

export type Note = { kind: "ok" | "err"; text: string };

interface DashboardCtx {
  data: SummaryResp | null;
  month: string;
  banksConfigured: boolean;
  busy: boolean;
  note: Note | null;
  setNote: (n: Note | null) => void;
  load: (m?: string) => Promise<void>;
  selectMonth: (m: string) => void;
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  setCategory: (id: string, category: string) => Promise<void>;
  setBudget: (category: string, limit: number) => Promise<void>;
}

const Ctx = createContext<DashboardCtx | null>(null);

export function useDashboard(): DashboardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<SummaryResp | null>(null);
  const [banksConfigured, setBanksConfigured] = useState(true);
  const [month, setMonth] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const load = useCallback(async (m?: string) => {
    const res = await fetch(`/api/summary${m ? `?month=${m}` : ""}`);
    if (res.status === 401) {
      window.location.href = "/signin";
      return;
    }
    const json: SummaryResp = await res.json();
    setData(json);
    setMonth(json.summary.month);
  }, []);

  useEffect(() => {
    // The sign-in page lives under the same provider but has no data to load.
    if (pathname === "/signin") return;
    load();
    const p = new URLSearchParams(window.location.search);
    if (p.get("connected"))
      setNote({ kind: "ok", text: `Connected ${p.get("connected")}.` });
    if (p.get("error")) setNote({ kind: "err", text: `Error: ${p.get("error")}` });
    if (p.get("connected") || p.get("error"))
      window.history.replaceState({}, "", window.location.pathname);
    fetch("/api/banks")
      .then((r) => r.json())
      .then((j) => setBanksConfigured(Boolean(j.configured)))
      .catch(() => setBanksConfigured(false));
  }, [load, pathname]);

  const selectMonth = useCallback(
    (m: string) => {
      setMonth(m);
      load(m);
    },
    [load]
  );

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/connect", { method: "POST" });
      const j = await res.json();
      if (j.url) window.location.href = j.url;
      else setNote({ kind: "err", text: j.error || "Could not start connection" });
    } finally {
      setBusy(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const j = await res.json();
      if (j.error) setNote({ kind: "err", text: j.error });
      else {
        const extra = j.transfers
          ? ` (${j.transfers} internal transfer${j.transfers === 1 ? "" : "s"} excluded)`
          : "";
        setNote({
          kind: "ok",
          text: `Synced ${j.transactions} transactions from ${j.accounts} account(s)${extra}.`,
        });
        await load(month);
      }
      if (j.errors?.length) setNote({ kind: "err", text: j.errors.join("; ") });
    } finally {
      setBusy(false);
    }
  }, [load, month]);

  const setCategory = useCallback(
    async (id: string, category: string) => {
      try {
        const res = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, category }),
        });
        const j = await res.json();
        if (j.error) {
          setNote({ kind: "err", text: j.error });
          return;
        }
        if (j.updated > 1)
          setNote({
            kind: "ok",
            text: `Categorised as ${category} and applied to ${j.updated} matching transactions.`,
          });
        await load(month);
      } catch (e) {
        setNote({
          kind: "err",
          text: e instanceof Error ? e.message : "Could not save category",
        });
      }
    },
    [load, month]
  );

  const setBudget = useCallback(
    async (category: string, limit: number) => {
      try {
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, limit }),
        });
        const j = await res.json();
        if (j.error) {
          setNote({ kind: "err", text: j.error });
          return;
        }
        await load(month);
      } catch (e) {
        setNote({
          kind: "err",
          text: e instanceof Error ? e.message : "Could not save budget",
        });
      }
    },
    [load, month]
  );

  return (
    <Ctx.Provider
      value={{
        data,
        month,
        banksConfigured,
        busy,
        note,
        setNote,
        load,
        selectMonth,
        connect,
        sync,
        setCategory,
        setBudget,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
