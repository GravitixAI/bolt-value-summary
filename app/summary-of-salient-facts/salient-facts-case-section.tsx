"use client";

import * as React from "react";
import { PropertyRecord } from "@/app/commercial-value-summary/types";
import { fmtCurrency, fmtCurrencyCents, fmtInt, fmtSitus } from "@/app/commercial-value-summary/format";

interface Props {
  record: PropertyRecord;
  included: boolean;
  onToggle: () => void;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <th
        colSpan={4}
        className="bg-muted px-4 py-2 text-left text-sm font-semibold text-foreground tracking-tight"
      >
        {children}
      </th>
    </tr>
  );
}

function DataRow({
  label,
  value,
  unit,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
}) {
  return (
    <tr className="border-b border-border">
      <td className="w-[35%]" />
      <td className="px-4 py-2 text-right text-sm text-muted-foreground">{label}</td>
      <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{value}</td>
      <td className="px-4 py-2 text-left text-xs text-muted-foreground">{unit ?? ""}</td>
    </tr>
  );
}

export function SalientFactsCaseSection({ record: r, included, onToggle }: Props) {
  const situsLines = fmtSitus(r.Situs);

  return (
    <div
      id={`prop-${r.PropID}`}
      className={`rounded-lg border bg-card overflow-hidden transition-opacity ${
        included ? "border-border" : "border-border opacity-40"
      }`}
    >
      {/* Case header */}
      <div className="flex flex-col gap-1 border-b border-border bg-card px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
        {/* Include toggle — hidden for now, kept for future use */}
        <div className="hidden flex shrink-0 flex-col items-center gap-1 pt-1">
          <button
            type="button"
            role="switch"
            aria-checked={included}
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              included ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                included ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {included ? "Included" : "Excluded"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Prop ID</p>
          <p className="font-mono text-lg font-bold text-primary">{r.PropID}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Geo ID: {r.GeoID}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Owner</p>
          <p className="text-sm font-medium text-foreground">{r.OwnerName}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Situs</p>
          {situsLines.map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-snug">{line}</p>
          ))}
        </div>
      </div>

      {/* Details table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {/* ── PROPERTY ── */}
            <SectionHeader>Property</SectionHeader>
            <DataRow label="Neighborhood" value={r.Nbhd ?? r.SubMarket} />
            <DataRow label="Gross Living Area" value={fmtInt(r.Imprv_GrossBldgArea)} unit="sq. ft." />
            <DataRow
              label="Price per sq. ft."
              value={fmtCurrencyCents(
                r.Imprv_GrossBldgArea > 0 ? r.RecommendedVal / r.Imprv_GrossBldgArea : 0
              )}
              unit="per sq. ft."
            />
            <DataRow label="Year Built" value={r.Imprv_YearBuilt} />

            {/* ── Per-property totals ── */}
            <tr className="border-b border-border bg-muted/40">
              <td className="w-[35%]" />
              <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                Indicated Value
              </td>
              <td className="px-4 py-3 text-right text-base font-bold text-primary">
                {fmtCurrency(r.RecommendedVal)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
