"use client";

import * as React from "react";
import { PropertyRecord } from "./types";
import {
  fmtCurrency,
  fmtCurrencyCents,
  fmtInt,
  fmtDecimal,
  fmtSitus,
  hasApproach,
} from "./format";

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
      <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </td>
      <td />
    </tr>
  );
}

export function CaseSection({ record: r, included, onToggle }: Props) {
  const [showSqFt, setShowSqFt] = React.useState(r.Land_ApprMethod === "SQ");

  const isCost = hasApproach(r.ApprMethod, "C");
  const isIncome = hasApproach(r.ApprMethod, "I");
  const isMarket = hasApproach(r.ApprMethod, "M");

  const [costOpen, setCostOpen] = React.useState(isCost);
  const [incomeOpen, setIncomeOpen] = React.useState(isIncome);
  const [marketOpen, setMarketOpen] = React.useState(isMarket);

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
        {/* Include toggle */}
        <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
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
            {/* ── LAND ── */}
            <SectionHeader>Land</SectionHeader>
            <DataRow label="Square Footage" value={fmtInt(r.Land_SqFt)} unit="sq. ft." />
            <DataRow label="Acreage" value={fmtDecimal(r.Land_Acres)} unit="acres" />
            <tr className="border-b border-border">
              <td className="w-[35%]" />
              <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                {showSqFt ? "Price per sq. ft." : "Price per acre"}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">
                {showSqFt
                  ? `${fmtCurrency(r.Land_SqFt_UP)} per sq. ft.`
                  : `${fmtCurrency(r.Land_Acres_UP)} per acre`}
              </td>
              <td className="px-4 py-2 text-left">
                <button
                  type="button"
                  onClick={() => setShowSqFt((v) => !v)}
                  className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                  {showSqFt ? "Convert to acres" : "Convert to sq. ft."}
                </button>
              </td>
            </tr>
            <DataRow label="Land / Building Ratio" value={fmtDecimal(r.LandBuilding_Ratio)} />

            {/* ── IMPROVEMENT ── */}
            <SectionHeader>Improvement</SectionHeader>
            <DataRow label="Sub-market" value={r.SubMarket} />
            <DataRow label="Type" value={r.Imprv_Type} />
            <DataRow label="Gross Building Area" value={fmtInt(r.Imprv_GrossBldgArea)} unit="sq. ft." />
            <DataRow label="Net Leasable Area" value={fmtInt(r.Imprv_NetLeasableArea)} unit="sq. ft." />
            <DataRow label="Year Built" value={r.Imprv_YearBuilt} />

            {/* ── VALUATION ANALYSIS CONCLUSIONS ── */}
            <SectionHeader>Valuation Analysis Conclusions</SectionHeader>

            {/* Cost Approach */}
            <tr className="border-b border-border">
              <td className="w-[35%]" />
              <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setCostOpen((v) => !v)}
                  className="flex items-center gap-2 ml-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className={`inline-block h-3 w-3 rounded-sm border transition-colors ${costOpen ? "border-primary bg-primary" : "border-muted-foreground bg-transparent"}`} />
                  Cost Approach
                </button>
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{fmtCurrency(r.Cost_TotalVal)}</td>
              <td className="px-4 py-2 text-left text-xs text-muted-foreground">{fmtCurrencyCents(r.Cost_UnitPrice)} per sq. ft.</td>
            </tr>
            {costOpen && (
              <>
                <DataRow label="Land" value={fmtCurrency(r.Cost_LandVal)} />
                <DataRow label="Improvements" value={fmtCurrency(r.Cost_ImprvVal)} />
              </>
            )}

            {/* Income Approach */}
            <tr className="border-b border-border">
              <td className="w-[35%]" />
              <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setIncomeOpen((v) => !v)}
                  className="flex items-center gap-2 ml-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className={`inline-block h-3 w-3 rounded-sm border transition-colors ${incomeOpen ? "border-primary bg-primary" : "border-muted-foreground bg-transparent"}`} />
                  Income Approach
                </button>
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{fmtCurrency(r.Income_TotalVal)}</td>
              <td className="px-4 py-2 text-left text-xs text-muted-foreground">{fmtCurrencyCents(r.Income_UnitPrice)} per sq. ft.</td>
            </tr>
            {incomeOpen && (
              <>
                <tr className="border-b border-border">
                  <td className="w-[35%]" />
                  <td className="px-4 py-2 text-right text-sm text-muted-foreground">Rent</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{fmtCurrencyCents(r.RentRate)}</td>
                  <td className="px-4 py-2 text-left text-xs text-muted-foreground">{r.ExpenseStructureCd}</td>
                </tr>
                <DataRow label="Occupancy" value={fmtDecimal(r.OccupancyRate)} unit="%" />
                <DataRow label="Market Vacancy" value={fmtDecimal(r.GPIVacanyRate)} unit="%" />
                <DataRow label="Net Operating Income per sq. ft." value={fmtCurrencyCents(r.NetOperatingIncome)} />
                <DataRow label="Cap Rate" value={fmtDecimal(r.CapRate)} unit="%" />
                <tr className="border-b border-border">
                  <td className="w-[35%]" />
                  <td className="px-4 py-2 text-right text-sm text-muted-foreground">Excess Land</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{fmtCurrency(r.ExcessLandVal > 0 ? r.ExcessLandVal : 0)}</td>
                  <td className="px-4 py-2 text-left text-xs text-muted-foreground">+</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="w-[35%]" />
                  <td className="px-4 py-2 text-right text-sm text-muted-foreground">BPP</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{fmtCurrency(r.BPP_Val > 0 ? r.BPP_Val : 0)}</td>
                  <td className="px-4 py-2 text-left text-xs text-muted-foreground">−</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="w-[35%]" />
                  <td className="px-4 py-2 text-right text-sm text-muted-foreground">Lease-up</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold text-foreground">{fmtCurrency(r.LeaseUpCost > 0 ? r.LeaseUpCost : 0)}</td>
                  <td className="px-4 py-2 text-left text-xs text-muted-foreground">−</td>
                </tr>
                <DataRow label="Other Adj" value={fmtCurrency(r.Other_Adj > 0 ? r.Other_Adj : 0)} />
              </>
            )}

            {/* Market Approach */}
            <tr className="border-b border-border">
              <td className="w-[35%]" />
              <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setMarketOpen((v) => !v)}
                  className="flex items-center gap-2 ml-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className={`inline-block h-3 w-3 rounded-sm border transition-colors ${marketOpen ? "border-primary bg-primary" : "border-muted-foreground bg-transparent"}`} />
                  Market Approach
                </button>
              </td>
              <td /><td />
            </tr>
            {marketOpen && (
              <>
                <DataRow
                  label="Average Sales Price per sq. ft."
                  value={r.Market_AvgSalesPricePSF ? String(r.Market_AvgSalesPricePSF) : fmtCurrency(0)}
                  unit="per sq. ft."
                />
                <DataRow
                  label="Number of Sales"
                  value={r.Market_NumOfSales ? String(r.Market_NumOfSales) : "0"}
                />
              </>
            )}

            {/* Per-property totals */}
            <tr className="border-b border-border bg-muted/40">
              <td className="w-[35%]" />
              <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                Recommended / Reconciled Value To ARB
              </td>
              <td className="px-4 py-3 text-right text-base font-bold text-primary">
                {fmtCurrency(r.RecommendedVal)}
              </td>
              <td />
            </tr>
            <tr className="bg-muted/20">
              <td className="w-[35%]" />
              <td className="px-4 py-3 text-right text-sm font-bold text-foreground">Assessed Value</td>
              <td className="px-4 py-3 text-right text-base font-bold text-foreground">
                {fmtCurrency(r.AssessedVal)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
