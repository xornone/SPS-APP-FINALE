import { GROUP_INFO, type GroupLevel } from "@/lib/types";

const STYLES: Record<GroupLevel, string> = {
  vert: "bg-emerald-50 text-emerald-950 border border-emerald-300 font-black dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400/40",
  rouge: "bg-red-50 text-red-950 border border-red-300 font-black dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/40",
  violet: "bg-violet-50 text-violet-950 border border-violet-300 font-black dark:bg-violet-500/25 dark:text-violet-200 dark:border-violet-400/40",
};

const STYLES_ON_DARK: Record<GroupLevel, string> = {
  vert: "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 backdrop-blur-sm",
  rouge: "bg-red-500/25 text-red-200 border border-red-400/40 backdrop-blur-sm",
  violet: "bg-violet-500/25 text-violet-200 border border-violet-400/40 backdrop-blur-sm",
};

const DOT_STYLES: Record<GroupLevel, string> = {
  vert: "bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)] dark:shadow-[0_0_8px_#34D399]",
  rouge: "bg-red-600 dark:bg-red-400 shadow-[0_0_6px_rgba(220,38,38,0.6)] dark:shadow-[0_0_8px_#F87171]",
  violet: "bg-violet-600 dark:bg-[#AA26FF] shadow-[0_0_6px_rgba(124,58,237,0.6)] dark:shadow-[0_0_8px_#C084FC]",
};

export function GroupBadge({
  group,
  withRange = true,
  onDark = false,
  withEmoji = false,
  pulse = false,
  size = "md",
  className = "",
}: {
  group: GroupLevel;
  withRange?: boolean;
  onDark?: boolean;
  withEmoji?: boolean;
  pulse?: boolean;
  size?: "xs" | "sm" | "md" | "title";
  className?: string;
}) {
  const info = GROUP_INFO[group];
  const sizeClasses =
    size === "title"
      ? "px-[0.55em] py-[0.14em] text-[0.66em] gap-[0.35em] font-sans font-extrabold tracking-tight align-middle -translate-y-[0.06em]"
      : size === "xs"
        ? "px-2 py-0.5 text-[10.5px] gap-1.5 font-extrabold"
        : size === "sm"
          ? "px-2.5 py-0.5 text-[11px] gap-1.5 font-extrabold"
          : "px-2.5 py-1 text-[11.5px] gap-1.5 font-extrabold";

  const dotSize =
    size === "title"
      ? "h-[0.55em] w-[0.55em]"
      : size === "xs"
        ? "h-1.5 w-1.5"
        : "h-2 w-2";

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-normal flex-shrink-0 leading-tight ${sizeClasses} ${
        onDark ? STYLES_ON_DARK[group] : STYLES[group]
      } ${className}`}
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0 ${DOT_STYLES[group]} ${
          pulse ? "animate-subtle-blink" : ""
        }`}
      />
      <span className="leading-none">{info.label}</span>
      {withRange && ` · ${info.range}`}
    </span>
  );
}
