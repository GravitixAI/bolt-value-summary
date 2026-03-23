import { ValueSummaryNavbar } from "@/components/value-summary-navbar";

export default function SummaryOfSalientFactsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ValueSummaryNavbar />
      <main className="container py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight">
          Summary of Salient Facts
        </h1>
      </main>
    </div>
  );
}
