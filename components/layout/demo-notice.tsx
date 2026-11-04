"use client";

import { useEffect, useState } from "react";

const SALES_WHATSAPP = "905465867927";

type Status = { level: "DEMO" | "ENTRY" | "PAID" | "RESTRICTED"; daysLeft: number };

/** The line under the header: the shared demo, the entry level's days, or restricted mode */
export function DemoNotice() {
  const [status, setStatus] = useState<Status | null>(null);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    let cancelled = false;
    try {
      const business = JSON.parse(localStorage.getItem("user") || "{}")?.business;
      setBusinessName(business?.name ?? "");
      if (business?.isDemo === true) return setStatus({ level: "DEMO", daysLeft: 0 });
      const token = localStorage.getItem("token");
      if (!token) return;
      fetch("/api/subscriptions/plan", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d?.level) setStatus({ level: d.level, daysLeft: d.daysLeft ?? 0 });
        })
        .catch(() => {});
    } catch {
      setStatus(null);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.level === "PAID") return null;
  if (status.level === "DEMO") {
    return (
      <p role="note" data-testid="demo-notice" className="border-b bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
        Demo hesap: veriler her gece 03.00&apos;te sıfırlanır. Gerçek bilgi girmeyin.
      </p>
    );
  }
  const link = `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(`Merhaba, LaundryPro programını tam olarak kullanmaya devam etmek istiyorum. İşletmem: ${businessName}`)}`;
  const restricted = status.level === "RESTRICTED";
  return (
    <p role="note" data-testid="plan-notice" className={`border-b px-4 py-1.5 text-center text-xs font-medium ${restricted ? "bg-red-100 text-red-950" : "bg-sky-100 text-sky-950"}`}>
      {restricted ? "Kısıtlı moddasınız. Tam kullanım için bize yazın." : `Giriş seviyesi: bütün özellikler açık, ${status.daysLeft} gün kaldı.`}{" "}
      <a href={link} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
        {restricted ? "WhatsApp'tan yazın" : "Devam etmek için yazın"}
      </a>
    </p>
  );
}
