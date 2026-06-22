import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COMPANY_INFO } from "@/lib/constants";
import { DitrucksLogoMark } from "./logo";

export const BRAND_AMBER = "#f6b31c";
export const BRAND_DARK = "#0f172a";

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BRAND_DARK,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: BRAND_AMBER,
    paddingBottom: 10,
    marginBottom: 18,
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
  headerContact: {
    alignItems: "flex-end",
  },
  headerContactLine: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 1,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

export function PdfHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={pdfStyles.headerRow}>
      <View>
        <DitrucksLogoMark width={120} />
        {subtitle && <Text style={pdfStyles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View style={pdfStyles.headerContact}>
        <Text style={pdfStyles.headerContactLine}>{COMPANY_INFO.address}</Text>
        <Text style={pdfStyles.headerContactLine}>{COMPANY_INFO.phone}</Text>
        <Text style={pdfStyles.headerContactLine}>{COMPANY_INFO.email}</Text>
        <Text style={pdfStyles.headerContactLine}>{COMPANY_INFO.website}</Text>
      </View>
    </View>
  );
}

export function PdfFooter({ pageLabel }: { pageLabel?: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        {COMPANY_INFO.legalName} · {COMPANY_INFO.website}
      </Text>
      <Text
        style={pdfStyles.footerText}
        render={({ pageNumber, totalPages }) =>
          `${pageLabel ? pageLabel + " · " : ""}Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}
