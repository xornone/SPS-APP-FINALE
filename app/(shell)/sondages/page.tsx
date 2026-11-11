import { PollsView } from "@/components/PollsView";

export const metadata = {
  title: "Sondages — SPS",
  description: "Participez aux décisions, votez pour vos sorties et projets préférés du club SPS.",
};

export default function SondagesPage() {
  return <PollsView />;
}
