import { View, Text, Image } from "@react-pdf/renderer";
import * as React from "react";

// Absolute URL needed for @react-pdf/renderer to fetch the logo at render time.
// In production this will be the app's own origin; in dev we reference localhost.
const LOGO_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/ccad-logo.png`
    : "/ccad-logo.png";

export function PdfHeader() {
  return (
    <View fixed style={{ marginBottom: 16 }}>
      {/* Top border */}
      <View style={{ borderTopWidth: 1.5, borderTopColor: "#000", marginBottom: 4 }} />

      {/* Content row */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Left: logo contained within the header borders */}
        <View style={{ width: 52, marginRight: 10 }}>
          <Image
            src={LOGO_URL}
            style={{ width: 52, height: 32 }}
          />
        </View>

        {/* Center: org name + address */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "bold" }}>
            Collin Central Appraisal District
          </Text>
          <Text style={{ fontSize: 8, color: "#444", marginTop: 2 }}>
            250 Eldorado Parkway - McKinney, TX 75069-8023
          </Text>
        </View>

        {/* Right: phone + website */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 9 }}>(469) 742-9200</Text>
          <Text style={{ fontSize: 9, marginTop: 2 }}>www.collincad.org</Text>
        </View>
      </View>

      {/* Bottom border */}
      <View style={{ borderTopWidth: 1.5, borderTopColor: "#000", marginTop: 4 }} />
    </View>
  );
}
