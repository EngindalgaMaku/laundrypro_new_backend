"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface AppShellProps {
  children: React.ReactNode;
  /**
   * Without a signed-in user: redirect to sign-in (default), or render the
   * content on its own for pages that are also public (e.g. help).
   */
  requireAuth?: boolean;
}

/** Sidebar + header around a page, the same frame the other app pages build inline. */
export function AppShell({ children, requireAuth = true }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      setUser(JSON.parse(raw));
    } else if (requireAuth) {
      router.push("/");
      return;
    }
    setChecked(true);
  }, [router, requireAuth]);

  if (!checked) {
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>;
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
