import type { Metadata } from "next";

// Tracking pages are per-customer links; keep them out of search engines
export const metadata: Metadata = {
  title: "Sipariş Takibi",
  robots: { index: false, follow: false },
};

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
