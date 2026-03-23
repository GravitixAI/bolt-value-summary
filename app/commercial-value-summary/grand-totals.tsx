import * as React from "react";
import { fmtCurrency } from "./format";

interface Props {
  totalRecommendedVal: number;
  totalAssessedVal: number;
}

export function GrandTotals({ totalRecommendedVal, totalAssessedVal }: Props) {
  return (
    <div className="sticky bottom-0 z-40 overflow-x-auto rounded-t-lg border border-b-0 border-border bg-background shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-border bg-muted/60">
            <td className="w-[35%]" />
            <td className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Recommended / Reconciled Value To ARB
            </td>
            <td className="px-4 py-3 text-right text-lg font-bold text-primary">
              {fmtCurrency(totalRecommendedVal)}
            </td>
          </tr>
          <tr className="bg-muted/30">
            <td className="w-[35%]" />
            <td className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Assessed Value
            </td>
            <td className="px-4 py-3 text-right text-lg font-bold text-foreground">
              {fmtCurrency(totalAssessedVal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
