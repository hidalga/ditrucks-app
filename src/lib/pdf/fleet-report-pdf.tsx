import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfFooter, pdfStyles } from "./letterhead";

const styles = StyleSheet.create({
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#475569", marginBottom: 2 },
  date: { fontSize: 9, color: "#94a3b8", marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 8 },
  summaryRow: { flexDirection: "row", marginBottom: 4 },
  sumBox: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 8, alignItems: "center", marginRight: 6 },
  sumValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  sumLabel: { fontSize: 8, color: "#64748b", marginTop: 2 },
  alertBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 4, padding: 10, marginBottom: 4 },
  alertTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#991b1b" },
  alertText: { fontSize: 9, color: "#b91c1c", marginTop: 2 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#475569", padding: 5, backgroundColor: "#f8fafc" },
  td: { fontSize: 8, color: "#1e293b", padding: 5 },
  colUnit: { flexBasis: "23%" },
  colId: { flexBasis: "14%" },
  colScore: { flexBasis: "8%", textAlign: "center" },
  colStatus: { flexBasis: "14%", textAlign: "center" },
  colDate: { flexBasis: "15%" },
  detailCard: { borderWidth: 1, borderColor: "#e2e8f0", borderLeftWidth: 3, borderRadius: 4, padding: 8, marginBottom: 6 },
  detailHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  detailTitle: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  detailUrgency: { fontSize: 8 },
  detailSummary: { fontSize: 8, color: "#475569", marginTop: 2 },
  detailRecommendation: { fontSize: 8, color: "#64748b", marginTop: 2 },
});

const scoreColor = (s: number | null) => {
  if (s === null) return "#94a3b8";
  if (s >= 85) return "#16a34a";
  if (s >= 70) return "#2563eb";
  if (s >= 50) return "#d97706";
  if (s >= 30) return "#ea580c";
  return "#dc2626";
};
const URGENCY_LABEL: Record<string, string> = { critical: "Crítico", urgent: "Urgente", schedule: "Agendar", monitor: "Monitorear", none: "Bien" };
const URGENCY_COLOR: Record<string, string> = { critical: "#b91c1c", urgent: "#c2410c", schedule: "#b45309", monitor: "#1d4ed8", none: "#15803d" };

export interface FleetReportPdfProps {
  companyName: string;
  generatedAt: string;
  summary: { total: number; critical: number; urgent: number; schedule: number; monitor: number; good: number };
  fleet: Array<{
    id: string;
    brand: string;
    model: string;
    year: number | null;
    plates: string | null;
    economicNumber: string | null;
    vin: string | null;
    score: number | null;
    dpfScore: number | null;
    scrScore: number | null;
    egrScore: number | null;
    recommendation?: string | null;
    lastOrderDate?: string | null;
    projection?: { overallUrgency: string; summary: string } | null;
  }>;
}

export function FleetReportPdf({ companyName, generatedAt, summary, fleet }: FleetReportPdfProps) {
  const needsAttention = fleet.filter((v) => v.projection && v.projection.overallUrgency !== "none");

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader subtitle="Reporte Ejecutivo de Flota" />

        <Text style={styles.title}>Reporte Ejecutivo de Flota</Text>
        {companyName && <Text style={styles.subtitle}>{companyName}</Text>}
        <Text style={styles.date}>{generatedAt}</Text>

        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.summaryRow}>
          <SumBox label="Total" value={summary.total} color="#1e293b" />
          <SumBox label="Crítico" value={summary.critical} color="#dc2626" />
          <SumBox label="Urgente" value={summary.urgent} color="#ea580c" />
          <SumBox label="Agendar" value={summary.schedule} color="#d97706" />
          <SumBox label="Monitorear" value={summary.monitor} color="#2563eb" />
          <SumBox label="Bien" value={summary.good} color="#16a34a" />
        </View>

        {(summary.critical > 0 || summary.urgent > 0) && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>
              {summary.critical + summary.urgent} unidad(es) requieren atención inmediata
            </Text>
            <Text style={styles.alertText}>
              Se recomienda agendar una revisión preventiva para evitar paros en ruta y daños que incrementan costos.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Estado por Unidad</Text>
        <View style={styles.table}>
          <View style={[styles.tr, { borderBottomWidth: 0 }]}>
            <Text style={[styles.th, styles.colUnit]}>Unidad</Text>
            <Text style={[styles.th, styles.colId]}>Identificación</Text>
            <Text style={[styles.th, styles.colScore]}>Score</Text>
            <Text style={[styles.th, styles.colScore]}>DPF</Text>
            <Text style={[styles.th, styles.colScore]}>SCR</Text>
            <Text style={[styles.th, styles.colScore]}>EGR</Text>
            <Text style={[styles.th, styles.colStatus]}>Estado</Text>
            <Text style={[styles.th, styles.colDate]}>Últ. Servicio</Text>
          </View>
          {fleet.map((v) => {
            const urg = v.projection?.overallUrgency || "none";
            return (
              <View key={v.id} style={styles.tr}>
                <Text style={[styles.td, styles.colUnit]}>{v.brand} {v.model} {v.year || ""}</Text>
                <Text style={[styles.td, styles.colId]}>
                  {v.plates || (v.economicNumber ? "#" + v.economicNumber : null) || (v.vin ? v.vin.slice(-6) : "—")}
                </Text>
                <Text style={[styles.td, styles.colScore, { color: scoreColor(v.score), fontFamily: "Helvetica-Bold" }]}>{v.score ?? "—"}</Text>
                <Text style={[styles.td, styles.colScore, { color: scoreColor(v.dpfScore) }]}>{v.dpfScore ?? "—"}</Text>
                <Text style={[styles.td, styles.colScore, { color: scoreColor(v.scrScore) }]}>{v.scrScore ?? "—"}</Text>
                <Text style={[styles.td, styles.colScore, { color: scoreColor(v.egrScore) }]}>{v.egrScore ?? "—"}</Text>
                <Text style={[styles.td, styles.colStatus, { color: URGENCY_COLOR[urg] }]}>{URGENCY_LABEL[urg]}</Text>
                <Text style={[styles.td, styles.colDate]}>{v.lastOrderDate ? new Date(v.lastOrderDate).toLocaleDateString("es-MX") : "—"}</Text>
              </View>
            );
          })}
        </View>

        {needsAttention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Unidades que Requieren Atención</Text>
            {needsAttention.map((v) => {
              const urg = v.projection!.overallUrgency;
              return (
                <View key={v.id} style={[styles.detailCard, { borderLeftColor: URGENCY_COLOR[urg] }]}>
                  <View style={styles.detailHeaderRow}>
                    <Text style={styles.detailTitle}>{v.brand} {v.model} {v.year || ""}</Text>
                    <Text style={[styles.detailUrgency, { color: URGENCY_COLOR[urg] }]}>{URGENCY_LABEL[urg]}</Text>
                  </View>
                  <Text style={styles.detailSummary}>{v.projection!.summary}</Text>
                  {v.recommendation && <Text style={styles.detailRecommendation}>{v.recommendation}</Text>}
                </View>
              );
            })}
          </>
        )}

        <PdfFooter pageLabel="Reporte de Flota" />
      </Page>
    </Document>
  );
}

function SumBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.sumBox}>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  );
}
