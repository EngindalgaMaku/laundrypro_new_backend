import { cn } from "@/lib/utils";
import { orderStatusInfo } from "@/lib/order-status";

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const { label, classes } = orderStatusInfo(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        classes.badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
