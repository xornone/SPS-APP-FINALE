import type { Metadata } from "next";
import { PreorderShowcase } from "@/components/PreorderShowcase";

export const metadata: Metadata = {
  title: "Précommandes SPS 2027 — Maillots, Cuissard & Gilet",
  description:
    "Découvrez et précommandez la collection officielle SPS 2027 : maillots CX SCA & Pulse, cuissard X et gilet coupe-vent Plus 2.0.",
};

export default function PrecommandesPage() {
  return <PreorderShowcase />;
}
