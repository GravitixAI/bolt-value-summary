"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { AdvancedThemeSwitcher } from "@/components/advanced-theme-switcher";
import { cn } from "@/lib/utils";

function BoltLogo() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-red-600 via-amber-500 to-yellow-400">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-white drop-shadow-sm"
        fill="currentColor"
        aria-hidden
      >
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    </div>
  );
}

const navItems = [
  { href: "/", label: "Home" },
  { href: "/commercial-value-summary", label: "Commercial Value Summary" },
  { href: "/summary-of-salient-facts", label: "Summary of Salient Facts" },
] as const;

interface ValueSummaryNavbarProps {
  subRow?: React.ReactNode;
}

export function ValueSummaryNavbar({ subRow }: ValueSummaryNavbarProps = {}) {
  const pathname = usePathname();

  const activeLabel =
    navItems.find(
      ({ href }) =>
        href !== "/" && (pathname === href || pathname.startsWith(`${href}/`))
    )?.label ?? "Value Summary";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-85"
            aria-label="Home"
          >
            <BoltLogo />
          </Link>
          <span className="truncate text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
            {activeLabel}
          </span>
        </div>

        <nav className="hidden min-w-0 flex-1 justify-center lg:flex">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 xl:gap-x-8">
            {navItems.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "whitespace-nowrap text-xs font-medium transition-colors xl:text-sm",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-md p-2 text-foreground transition-colors hover:bg-accent hover:text-primary"
            aria-label="Home"
          >
            <span className="relative inline-flex rounded border border-border p-0.5">
              <Home className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </Link>
          <AdvancedThemeSwitcher />
        </div>
      </div>

      <nav className="container border-t border-border py-2 lg:hidden">
        <ul className="flex flex-col gap-2">
          {navItems.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "block text-sm font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {subRow && (
        <div className="border-t border-border">
          {subRow}
        </div>
      )}
    </header>
  );
}
