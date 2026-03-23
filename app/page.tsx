"use client";

import Link from "next/link";
import { Building2, FileText } from "lucide-react";
import { ValueSummaryNavbar } from "@/components/value-summary-navbar";

const cards = [
  {
    href: "/commercial-value-summary",
    title: "Commercial Value Summary",
    Icon: Building2,
  },
  {
    href: "/summary-of-salient-facts",
    title: "Summary of Salient Facts",
    Icon: FileText,
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ValueSummaryNavbar />

      <main className="container py-10 sm:py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, title, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-[200px] flex-col justify-between rounded-xl border border-border bg-card p-8 transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Icon
                className="h-10 w-10 text-primary transition-transform group-hover:scale-105"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-lg font-bold leading-snug tracking-tight text-foreground">
                {title}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
