"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Loader2 } from "lucide-react";

interface DemoAccount {
  label: string;
  email: string;
  password: string;
}

/** One tap into the demo business. Web only: the store app stays for real businesses */
export function DemoAccounts({ onSignIn, busy }: { onSignIn: (email: string, password: string) => void; busy: boolean }) {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    fetch("/api/public/demo")
      .then((r) => r.json())
      .then((d) => setAccounts(d.enabled ? d.accounts : []))
      .catch(() => {});
  }, []);

  if (accounts.length === 0) return null;

  return (
    <div data-testid="demo-accounts" className="rounded-xl border bg-muted/40 p-3 text-sm">
      <p className="font-semibold">Hemen deneyin</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Şifre gerekmez. Örnek veriler her gece sıfırlanır, gerçek bilgi girmeyin.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={busy}
            onClick={() => {
              setChosen(a.email);
              onSignIn(a.email, a.password);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 font-medium hover:bg-muted disabled:opacity-60"
          >
            {busy && chosen === a.email && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
