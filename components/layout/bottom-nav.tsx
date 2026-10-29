"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, LayoutGrid, Route, Users } from "lucide-react";

// The phone's main navigation: the four screens used all day, and Yönetim for everything else
const TABS = [
  { href: "/dashboard", label: "Ana Sayfa", icon: Home, match: ["/dashboard"] },
  { href: "/orders", label: "Siparişler", icon: ClipboardList, match: ["/orders"] },
  { href: "/rota", label: "Rota", icon: Route, match: ["/rota"] },
  { href: "/customers", label: "Müşteriler", icon: Users, match: ["/customers"] },
  {
    href: "/yonetim",
    label: "Yönetim",
    icon: LayoutGrid,
    match: ["/yonetim", "/kasa", "/giderler", "/destek", "/services", "/users", "/settings", "/routes", "/invoices", "/notifications", "/hakkinda", "/help"],
  },
];

// Screens without the bar: sign-in, onboarding, the public tracking page and legal texts
const HIDDEN_ON = ["/", "/onboarding", "/homepage", "/sifre-sifirla", "/takip", "/kvkk", "/gizlilik-politikasi", "/kullanim-sartlari", "/admin"];

/**
 * Fixed tab bar on phones and small tablets (hidden from lg up, where the sidebar is always
 * shown). While it is visible, body gets `has-bottom-nav` and globals.css shortens the
 * full-height page frames so nothing scrolls under it.
 */
export function BottomNav() {
  const pathname = usePathname() || "/";
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      setSignedIn(!!localStorage.getItem("token"));
    } catch {
      setSignedIn(false);
    }
  }, [pathname]);

  const hidden =
    !signedIn || HIDDEN_ON.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));

  useEffect(() => {
    document.body.classList.toggle("has-bottom-nav", !hidden);
    return () => document.body.classList.remove("has-bottom-nav");
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      aria-label="Ana menü"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-accent" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
