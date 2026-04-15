import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import * as React from "react";
import { PdfHeader } from "@/app/commercial-value-summary/pdf/PdfHeader";
import { PropertyRecord } from "@/app/commercial-value-summary/types";
import {
  fmtCurrency,
  fmtCurrencyCents,
  fmtInt,
  fmtSitus,
} from "@/app/commercial-value-summary/format";

// ---------------------------------------------------------------------------
// Styles (mirrors CommercialValueSummaryPdf palette/layout)
// ---------------------------------------------------------------------------

const c = {
  black: "#000000",
  darkGray: "#333333",
  midGray: "#333333",
  lightGray: "#555555",
  bgMuted: "#f3f4f6",
  bgMutedDark: "#e5e7eb",
  border: "#d1d5db",
  primary: "#1d4ed8",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: c.darkGray,
  },
  pageNumber: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: c.lightGray,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    color: c.black,
  },
  dateOfValuation: {
    fontSize: 9,
    color: c.midGray,
    marginBottom: 14,
  },

  // Case card
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.bgMuted,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 8,
  },
  cardHeaderCol: { flex: 1 },
  cardHeaderLabel: { fontSize: 7, color: c.lightGray, textTransform: "uppercase", marginBottom: 1 },
  cardHeaderValue: { fontSize: 9, fontWeight: "bold", color: c.darkGray },
  cardHeaderSub: { fontSize: 8, color: c.midGray },

  // Data rows
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dataLabel: { flex: 2, textAlign: "right", fontSize: 8, color: c.midGray, paddingRight: 8 },
  dataValue: { flex: 1, textAlign: "right", fontSize: 8, fontWeight: "bold", color: c.darkGray },
  dataUnit: { flex: 1, fontSize: 7, color: c.lightGray, paddingLeft: 4 },

  // Sub-section header
  subHeader: {
    flexDirection: "row",
    backgroundColor: c.bgMuted,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  subHeaderText: { fontSize: 8, fontWeight: "bold", color: c.darkGray },

  // Totals
  totalRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: c.bgMutedDark,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  totalLabel: { flex: 2, textAlign: "right", fontSize: 8, fontWeight: "bold", color: c.darkGray, paddingRight: 8 },
  totalValue: { flex: 1, textAlign: "right", fontSize: 9, fontWeight: "bold", color: c.primary },

});

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function DataRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={s.dataValue}>{value}</Text>
      <Text style={s.dataUnit}>{unit ?? ""}</Text>
    </View>
  );
}

function SubHeader({ children }: { children: string }) {
  return (
    <View style={s.subHeader}>
      <Text style={s.subHeaderText}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Per-property case section (Property only — no Land, no approaches)
// ---------------------------------------------------------------------------

function CaseSectionPdf({ record: r }: { record: PropertyRecord }) {
  const situsLines = fmtSitus(r.Situs);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.cardHeaderCol}>
          <Text style={s.cardHeaderLabel}>Prop ID</Text>
          <Text style={[s.cardHeaderValue, { color: c.primary }]}>{r.PropID}</Text>
          <Text style={s.cardHeaderSub}>Geo ID: {r.GeoID}</Text>
        </View>
        <View style={s.cardHeaderCol}>
          <Text style={s.cardHeaderLabel}>Owner</Text>
          <Text style={s.cardHeaderValue}>{r.OwnerName}</Text>
          {r.AgentName ? <Text style={s.cardHeaderSub}>{r.AgentName}</Text> : null}
        </View>
        <View style={s.cardHeaderCol}>
          <Text style={s.cardHeaderLabel}>Situs</Text>
          {situsLines.map((line, i) => (
            <Text key={i} style={s.cardHeaderValue}>{line}</Text>
          ))}
        </View>
      </View>

      {/* Property */}
      <SubHeader>Property</SubHeader>
      <DataRow label="Neighborhood" value={r.Nbhd ?? r.SubMarket} />
      <DataRow label="Gross Living Area" value={fmtInt(r.Imprv_GrossBldgArea)} unit="sq. ft." />
      <DataRow label="Year Built" value={String(r.Imprv_YearBuilt)} />

      {/* Per-property totals */}
      <View style={[s.totalRow, { backgroundColor: c.bgMutedDark }]}>
        <Text style={s.totalLabel}>Indicated Value</Text>
        <Text style={s.totalValue}>{fmtCurrency(r.RecommendedVal)}</Text>
        <Text style={[s.dataUnit, { textAlign: "center" }]}>
          {fmtCurrencyCents(
            r.Imprv_GrossBldgArea > 0 ? r.RecommendedVal / r.Imprv_GrossBldgArea : 0
          )} per sq. ft.
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

interface Props {
  records: PropertyRecord[];
  included: Set<number>;
  year: string;
}

export function SalientFactsPdf({
  records,
  included,
  year,
}: Props) {
  const includedRecords = records.filter((r) => included.has(r.PropID));

  return (
    <Document
      title={`Summary of Salient Facts – ${year}`}
      author="Collin Central Appraisal District"
    >
      <Page size="LETTER" style={s.page}>
        <PdfHeader />

        {/* Title */}
        <Text style={[s.sectionTitle, { marginBottom: 6 }]}>
          Summary of Salient Facts — {year} Tax Year
        </Text>

        {/* Date of valuation */}
        <Text style={s.dateOfValuation}>
          Date of Valuation: January 1, {year}
        </Text>

        {/* Per-property case section — flows on the first page */}
        {includedRecords.map((r) => (
          <CaseSectionPdf key={r.PropID} record={r} />
        ))}

        {/* Page numbers */}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
