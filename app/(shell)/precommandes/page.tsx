import type { Metadata } from "next";
import { PreorderShowcase } from "@/components/PreorderShowcase";

export const metadata: Metadata = {
  title: "Précommandes SPS 2027 — Maillots CX SCA, Pulse & Cuissard X",
  description:
    "Découvrez et précommandez la collection officielle SPS 2027 : maillot court Gobik CX SCA, cuissard technique Modèle X et maillot manches longues Pulse.",
};

export default function PrecommandesPage() {
  return <PreorderShowcase />;
}
