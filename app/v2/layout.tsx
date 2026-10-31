import { V2BottomNav } from "@/components/v2/V2BottomNav";
import { AdminPushSync } from "@/components/AdminPushSync";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#F3F0F7] text-neutral-950 selection:bg-[#AA26FF] selection:text-white relative transition-colors duration-200 dark:bg-[#08050D] dark:text-white">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(147,51,234,0.08),rgba(243,240,247,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(147,51,234,0.22),rgba(8,5,13,0))]"
      />
      <AdminPushSync />
      <div className="relative z-10 flex-1 pb-28">{children}</div>
      <V2BottomNav />
    </div>
  );
}
