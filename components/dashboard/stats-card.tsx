import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value?: number | null;
  description?: string;
  icon: LucideIcon;
}

export function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  const safeValue = typeof value === "number" && isFinite(value) ? value : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {safeValue.toLocaleString("tr-TR")}
      </p>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
