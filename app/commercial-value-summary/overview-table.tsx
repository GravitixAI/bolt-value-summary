"use client";

import * as React from "react";
import { PropertyRecord } from "./types";

interface Props {
  records: PropertyRecord[];
  included: Set<number>;
  onRowClick: (propId: number) => void;
  onToggle: (propId: number) => void;
}

export function OverviewTable({ records, included, onRowClick, onToggle }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-center">Include</th>
            <th className="px-4 py-3 text-left">Prop ID</th>
            <th className="px-4 py-3 text-left">Geo ID</th>
            <th className="px-4 py-3 text-left">Owner Name</th>
            <th className="px-4 py-3 text-left">Situs</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const isIncluded = included.has(r.PropID);
            return (
              <tr
                key={r.PropID}
                onClick={() => onRowClick(r.PropID)}
                className={`border-b border-border cursor-pointer transition-colors ${
                  isIncluded ? "hover:bg-accent" : "opacity-40 hover:bg-accent/50"
                }`}
              >
                <td
                  className="px-4 py-3 text-center"
                  onClick={(e) => { e.stopPropagation(); onToggle(r.PropID); }}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isIncluded}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      isIncluded ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        isIncluded ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-primary">{r.PropID}</td>
                <td className="px-4 py-3 text-foreground">{r.GeoID}</td>
                <td className="px-4 py-3 text-foreground">{r.OwnerName}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-pre-line">{r.Situs}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
