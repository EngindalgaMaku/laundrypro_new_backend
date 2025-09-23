import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value?: number | null;
  description?: string;
  trend?: string;
  icon: string;
  color?: "primary" | "success" | "warning" | "info";
}

export function StatsCard({
  title,
  value,
  description = "",
  trend = "",
  icon,
  color = "primary",
}: StatsCardProps) {
  const isPositive = trend?.startsWith("+") ?? false;
  const safeValue = typeof value === "number" && isFinite(value) ? value : 0;

  const colorClasses = {
    primary:
      "border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20",
    success:
      "border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/20 dark:to-cyan-900/20",
    warning:
      "border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/20",
    info: "border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/20 dark:to-sky-900/20",
  };

  const iconBgClasses = {
    primary: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    success: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    warning:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    info: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  };

  return (
    <Card
      className={cn(
        "card-hover shadow-lg border-0 transition-all duration-300 hover:shadow-xl active:scale-[0.98] cursor-pointer touch-target focus-ring",
        "bg-gradient-card backdrop-blur-sm",
        colorClasses[color]
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-5 pt-5">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <CardTitle className="text-xs sm:text-sm font-semibold text-foreground/90 leading-tight truncate">
            {title}
          </CardTitle>
          <div className="text-2xl sm:text-3xl font-bold text-foreground leading-none">
            {safeValue.toLocaleString()}
          </div>
        </div>
        <div
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-6 shadow-md",
            iconBgClasses[color]
          )}
        >
          <span className="text-xl sm:text-2xl">{icon}</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 w-fit",
              isPositive
                ? "bg-success/10 text-success border border-success/20 hover:bg-success/15"
                : "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/15"
            )}
          >
            <span
              className={cn(
                "text-xs",
                isPositive ? "text-success" : "text-warning"
              )}
            >
              {isPositive ? "↗" : "↘"}
            </span>
            <span>{trend}</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
