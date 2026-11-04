"use client";

import { useEffect, useState } from "react";

/** Reminds whoever is in the shared demo business that it is not a place for real data */
export function DemoNotice() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    try {
      setDemo(JSON.parse(localStorage.getItem("user") || "{}")?.business?.isDemo === true);
    } catch {
      setDemo(false);
    }
  }, []);

  if (!demo) return null;
  return (
    <p role="note" data-testid="demo-notice" className="border-b bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      Demo hesap: veriler her gece 03.00&apos;te sıfırlanır. Gerçek bilgi girmeyin.
    </p>
  );
}
