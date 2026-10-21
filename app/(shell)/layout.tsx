import { BottomNav } from "@/components/BottomNav";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#FBF9FC] dark:bg-[#130D1A]">
      <div className="flex-1 pb-4">{children}</div>
      <BottomNav />
    </div>
  );
}
