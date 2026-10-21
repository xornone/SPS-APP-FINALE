import type { Metadata } from "next";
import { PreorderShowcase } from "@/components/PreorderShowcase";

export const metadata: Metadata = {
  title: "Précommandes SPS 2027 — Collection Cyclisme & Running",
  description:
    "Découvrez et précommandez la collection officielle SPS 2027 : maillots CX SCA & Pulse, cuissard X, gilet Plus 2.0 et t-shirt running Flash.",
};

export default function PrecommandesPage() {
  return <PreorderShowcase />;
}
