import { GROUP_INFO, type GroupLevel } from "@/lib/types";

const STYLES: Record<GroupLevel, string> = {
  vert: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rouge: "bg-red-500/15 text-red-600 dark:text-red-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

export function GroupBadge({
  group,
  withRange = true,
  onDark = false,
  className = "",
}: {
  group: GroupLevel;
  withRange?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const info = GROUP_INFO[group];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${
        onDark ? "bg-white/15 text-white" : STYLES[group]
      } ${className}`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: onDark ? "currentColor" : info.hex }} />
      {info.label}
      {withRange && ` · ${info.range}`}
    </span>
  );
}
