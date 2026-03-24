import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import * as React from "react";
import { PdfHeader } from "./PdfHeader";
import { PropertyRecord, ApproachState } from "../types";
import {
  fmtCurrency,
  fmtCurrencyCents,
  fmtInt,
  fmtDecimal,
  fmtSitus,
} from "../format";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const c = {
  black: "#000000",
  darkGray: "#333333",
  midGray: "#555555",
  lightGray: "#888888",
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

  // ── Section title ──
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    color: c.black,
  },

  // ── Overview table ──
  table: { width: "100%", borderWidth: 1, borderColor: c.border, marginBottom: 16 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: c.bgMuted },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.border },
  tableCell: { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  tableCellText: { fontSize: 8 },
  tableHeaderText: { fontSize: 8, fontWeight: "bold", color: c.midGray },

  // ── Case card ──
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

  // ── Data rows ──
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

  // ── Sub-section header ──
  subHeader: {
    flexDirection: "row",
    backgroundColor: c.bgMuted,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  subHeaderText: { fontSize: 8, fontWeight: "bold", color: c.darkGray },

  // ── Totals ──
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

  // ── Grand totals ──
  grandTotalBox: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: c.bgMuted,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  grandTotalLabel: { fontSize: 9, fontWeight: "bold", color: c.darkGray },
  grandTotalValue: { fontSize: 9, fontWeight: "bold", color: c.primary },

  // ── Gallery ──
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  galleryCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 4,
    padding: 6,
    marginBottom: 8,
  },
  galleryLabel: { fontSize: 8, fontWeight: "bold", marginBottom: 4, color: c.darkGray },
  galleryImage: { width: "100%", height: 140, objectFit: "contain" },
});

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function DataRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
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
// Overview table
// ---------------------------------------------------------------------------

// Column flex widths: Prop ID narrow, Geo ID narrow, Owner Name wide, Situs medium, Page narrow
const colFlex = { propId: 0.6, geoId: 0.7, ownerName: 2, situs: 1.5, page: 0.35 };

function OverviewTablePdf({
  records,
  included,
  pageMap,
}: {
  records: PropertyRecord[];
  included: Set<number>;
  pageMap: Map<number, number>;
}) {
  return (
    <View style={s.table}>
      <View style={s.tableHeaderRow}>
        {(
          [
            ["Prop ID", colFlex.propId],
            ["Geo ID", colFlex.geoId],
            ["Owner Name", colFlex.ownerName],
            ["Situs", colFlex.situs],
            ["Page", colFlex.page],
          ] as [string, number][]
        ).map(([h, flex]) => (
          <View key={h} style={[s.tableCell, { flex }]}>
            <Text style={[s.tableHeaderText, h === "Page" ? { textAlign: "center" } : {}]}>{h}</Text>
          </View>
        ))}
      </View>
      {records
        .filter((r) => included.has(r.PropID))
        .map((r) => {
          const pg = pageMap.get(r.PropID);
          return (
            <View key={r.PropID} style={s.tableRow}>
              <View style={[s.tableCell, { flex: colFlex.propId }]}><Text style={s.tableCellText}>{r.PropID}</Text></View>
              <View style={[s.tableCell, { flex: colFlex.geoId }]}><Text style={s.tableCellText}>{r.GeoID}</Text></View>
              <View style={[s.tableCell, { flex: colFlex.ownerName }]}><Text style={s.tableCellText}>{r.OwnerName}</Text></View>
              <View style={[s.tableCell, { flex: colFlex.situs }]}><Text style={s.tableCellText}>{fmtSitus(r.Situs).join("\n")}</Text></View>
              <View style={[s.tableCell, { flex: colFlex.page }]}>
                <Text style={[s.tableCellText, { textAlign: "center" }]}>
                  {pg !== undefined ? String(pg) : "—"}
                </Text>
              </View>
            </View>
          );
        })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Per-property case section
// ---------------------------------------------------------------------------

function CaseSectionPdf({
  record: r,
  approachState,
}: {
  record: PropertyRecord;
  approachState: ApproachState;
}) {
  const isCost = approachState.cost;
  const isIncome = approachState.income;
  const isMarket = approachState.market;
  const useSqFt = approachState.showSqFt;
  const situsLines = fmtSitus(r.Situs);

  return (
    <View style={s.card} break>
      {/* Invisible anchor marker for two-pass page detection — do not remove */}
      <Text style={{ fontSize: 0.01, color: "#ffffff", height: 0 }}>{`##PID:${r.PropID}##`}</Text>

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

      {/* Land */}
      <SubHeader>Land</SubHeader>
      <DataRow label="Square Footage" value={fmtInt(r.Land_SqFt)} unit="sq. ft." />
      <DataRow label="Acreage" value={fmtDecimal(r.Land_Acres)} unit="acres" />
      <DataRow
        label={useSqFt ? "Price per sq. ft." : "Price per acre"}
        value={useSqFt ? fmtCurrencyCents(r.Land_SqFt_UP) : fmtCurrencyCents(r.Land_Acres_UP)}
        unit={useSqFt ? "per sq. ft." : "per acre"}
      />
      <DataRow label="Land / Building Ratio" value={fmtDecimal(r.LandBuilding_Ratio)} />

      {/* Improvement */}
      <SubHeader>Improvement</SubHeader>
      <DataRow label="Sub-market" value={r.SubMarket} />
      <DataRow label="Type" value={r.Imprv_Type} />
      <DataRow label="Gross Building Area" value={fmtInt(r.Imprv_GrossBldgArea)} unit="sq. ft." />
      <DataRow label="Net Leasable Area" value={fmtInt(r.Imprv_NetLeasableArea)} unit="sq. ft." />
      <DataRow label="Year Built" value={String(r.Imprv_YearBuilt)} />

      {/* Valuation Analysis Conclusions */}
      <SubHeader>Valuation Analysis Conclusions</SubHeader>

      {/* Cost Approach — only rendered when enabled */}
      {isCost && (
        <>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Cost Approach</Text>
            <Text style={s.dataValue}>{fmtCurrency(r.Cost_TotalVal)}</Text>
            <Text style={s.dataUnit}>{fmtCurrencyCents(r.Cost_UnitPrice)} per sq. ft.</Text>
          </View>
          <DataRow label="Land" value={fmtCurrency(r.Cost_LandVal)} />
          <DataRow label="Improvements" value={fmtCurrency(r.Cost_ImprvVal)} />
        </>
      )}

      {/* Income Approach — only rendered when enabled */}
      {isIncome && (
        <>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Income Approach</Text>
            <Text style={s.dataValue}>{fmtCurrency(r.Income_TotalVal)}</Text>
            <Text style={s.dataUnit}>{fmtCurrencyCents(r.Income_UnitPrice)} per sq. ft.</Text>
          </View>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Rent</Text>
            <Text style={s.dataValue}>{fmtCurrencyCents(r.RentRate)}</Text>
            <Text style={s.dataUnit}>{r.ExpenseStructureCd}</Text>
          </View>
          <DataRow label="Occupancy" value={fmtDecimal(r.OccupancyRate)} unit="%" />
          <DataRow label="Market Vacancy" value={fmtDecimal(r.GPIVacanyRate)} unit="%" />
          <DataRow label="Net Operating Income per sq. ft." value={fmtCurrencyCents(r.NetOperatingIncome)} />
          <DataRow label="Cap Rate" value={fmtDecimal(r.CapRate)} unit="%" />
          <DataRow label="Excess Land" value={fmtCurrency(r.ExcessLandVal > 0 ? r.ExcessLandVal : 0)} />
          <DataRow label="BPP" value={fmtCurrency(r.BPP_Val > 0 ? r.BPP_Val : 0)} />
          <DataRow label="Lease-up" value={fmtCurrency(r.LeaseUpCost > 0 ? r.LeaseUpCost : 0)} />
          <DataRow label="Other Adj" value={fmtCurrency(r.Other_Adj > 0 ? r.Other_Adj : 0)} />
        </>
      )}

      {/* Market Approach — only rendered when enabled */}
      {isMarket && (
        <>
          <View style={s.dataRow}>
            <Text style={s.dataLabel}>Market Approach</Text>
            <Text style={s.dataValue} />
            <Text style={s.dataUnit} />
          </View>
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
      <View style={[s.totalRow, { backgroundColor: c.bgMutedDark }]}>
        <Text style={s.totalLabel}>Recommended / Reconciled Value To ARB</Text>
        <Text style={s.totalValue}>{fmtCurrency(r.RecommendedVal)}</Text>
        <Text style={s.dataUnit} />
      </View>
      <View style={[s.totalRow, { backgroundColor: c.bgMuted }]}>
        <Text style={s.totalLabel}>Assessed Value</Text>
        <Text style={[s.totalValue, { color: c.darkGray }]}>{fmtCurrency(r.AssessedVal)}</Text>
        <Text style={s.dataUnit} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Image gallery page
// ---------------------------------------------------------------------------

interface GalleryEntry {
  imageSrc: string;
  label: string;
}

function GalleryPagePdf({ entries }: { entries: GalleryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <>
      <View break>
        <Text style={s.sectionTitle}>Property Images</Text>
        <View style={s.galleryGrid}>
          {entries.map((entry) => (
            <View key={entry.imageSrc} style={s.galleryCard}>
              <Text style={s.galleryLabel}>{entry.label}</Text>
              <Image src={entry.imageSrc} style={s.galleryImage} />
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

interface Props {
  records: PropertyRecord[];
  included: Set<number>;
  totalRecommended: number;
  totalAssessed: number;
  /** Pre-built gallery entries: { imageSrc: absolute proxy URL, label } */
  galleryEntries: GalleryEntry[];
  /** PropID → page number from the first rendering pass. Empty map on first pass. */
  pageMap: Map<number, number>;
  /** PropID → approach toggle state reflecting user's UI selections. */
  approachStates: Map<number, ApproachState>;
}

export function CommercialValueSummaryPdf({
  records,
  included,
  totalRecommended,
  totalAssessed,
  galleryEntries,
  pageMap,
  approachStates,
}: Props) {
  const includedRecords = records.filter((r) => included.has(r.PropID));

  return (
    <Document
      title={`Commercial Value Summary – ${records[0]?.Year ?? ""}`}
      author="Collin Central Appraisal District"
    >
      <Page size="LETTER" style={s.page}>
        <PdfHeader />

        {/* Title */}
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>
          ARB Commercial Value Summary — {records[0]?.Year ?? ""} Tax Year
        </Text>

        {/* Grand totals */}
        <View style={[s.grandTotalBox, { marginBottom: 14 }]}>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total Recommended / Reconciled Value to ARB</Text>
            <Text style={s.grandTotalValue}>{fmtCurrency(totalRecommended)}</Text>
          </View>
          <View style={[s.grandTotalRow, { borderBottomWidth: 0 }]}>
            <Text style={s.grandTotalLabel}>Total Assessed Value</Text>
            <Text style={[s.grandTotalValue, { color: c.darkGray }]}>{fmtCurrency(totalAssessed)}</Text>
          </View>
        </View>

        {/* Overview table — always shown in the PDF */}
        <>
          <Text style={[s.sectionTitle, { fontSize: 9, marginBottom: 4 }]}>
            Property Overview
          </Text>
          <OverviewTablePdf records={records} included={included} pageMap={pageMap} />
        </>

        {/* Per-property case sections */}
        {includedRecords.map((r) => (
          <CaseSectionPdf
            key={r.PropID}
            record={r}
            approachState={approachStates.get(r.PropID) ?? { cost: false, income: false, market: false }}
          />
        ))}

        {/* Image gallery */}
        <GalleryPagePdf entries={galleryEntries} />

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
