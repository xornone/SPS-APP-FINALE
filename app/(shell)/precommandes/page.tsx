import type { Metadata } from "next";
import { PreorderShowcase } from "@/components/PreorderShowcase";

export const metadata: Metadata = {
  title: "Précommandes SPS 2027 — Maillot CX SCA & Cuissard X",
  description:
    "Découvrez et précommandez la collection officielle SPS 2027 : le nouveau maillot Gobik CX SCA et le cuissard technique Modèle X avec peau graphène.",
};

export default function PrecommandesPage() {
  return <PreorderShowcase />;
}
