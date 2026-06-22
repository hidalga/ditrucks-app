import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfFooter, pdfStyles } from "./letterhead";
import type { QuoterResult } from "@/services/quoter-engine";

const styles = StyleSheet.create({
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  date: { fontSize: 9, color: "#94a3b8", marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 8 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaItem: { width: "50%", marginBottom: 8 },
  metaLabel: { fontSize: 8, color: "#64748b" },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 1 },
  kpiRow: { flexDirection: "row" },
  kpi: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, alignItems: "center", marginRight: 8 },
  kpiLabel: { fontSize: 9, color: "#64748b" },
  kpiValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 4 },
  detailGrid: { flexDirection: "row", marginTop: 12 },
  detailCard: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, marginRight: 8 },
  detailTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 4 },
  detailLabel: { fontSize: 8, color: "#64748b" },
  detailValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" },
  barWrap: { marginTop: 16 },
  barRow: { marginBottom: 10 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 9, marginBottom: 4 },
  barBg: { height: 14, borderRadius: 7, backgroundColor: "#e5e7eb", overflow: "hidden" },
  barFill: { height: 14, borderRadius: 7 },
  note: { fontSize: 8, color: "#64748b", marginTop: 14, lineHeight: 1.4 },
});

const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const fmt = (n: number) => pesos.format(n || 0);

export interface QuoterPdfProps {
  applicationLabel: string;
  mode: number;
  vans: number;
  trucks: number;
  systems: string[];
  generatedAt: string;
  result: QuoterResult;
}

export function QuoterPdf({ applicationLabel, mode, vans, trucks, systems, generatedAt, result }: QuoterPdfProps) {
  const maxV = Math.max(result.totalCorr, result.totalPrev, 1);
  const corrPct = Math.max(2, (result.totalCorr / maxV) * 100);
  const prevPct = Math.max(2, (result.totalPrev / maxV) * 100);

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader subtitle="Cotización Preventivo vs Correctivo" />

        <Text style={styles.title}>Cotización Preventivo vs Correctivo</Text>
        <Text style={styles.date}>{generatedAt}</Text>

        <Text style={styles.sectionTitle}>Aplicación Cotizada</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Vehículo / motor</Text>
            <Text style={styles.metaValue}>{applicationLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Número de desactivaciones</Text>
            <Text style={styles.metaValue}>{mode}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Unidades de la flota</Text>
            <Text style={styles.metaValue}>{result.totalUnits} ({vans} camioneta(s), {trucks} camión(es))</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Sistemas seleccionados</Text>
            <Text style={styles.metaValue}>{systems.join(" + ") || "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Comparativo Financiero</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Escenario correctivo</Text>
            <Text style={[styles.kpiValue, { color: "#b91c1c" }]}>{fmt(result.totalCorr)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Escenario preventivo</Text>
            <Text style={[styles.kpiValue, { color: "#0f172a" }]}>{fmt(result.totalPrev)}</Text>
          </View>
          <View style={[styles.kpi, { marginRight: 0, borderColor: "#16a34a", backgroundColor: "#f0fdf4" }]}>
            <Text style={styles.kpiLabel}>Ahorro estimado</Text>
            <Text style={[styles.kpiValue, { color: "#15803d" }]}>{fmt(result.savings)}</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Desglose correctivo</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Precio unitario</Text>
              <Text style={styles.detailValue}>{fmt(result.corrUnitPrice)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subtotal desactivación</Text>
              <Text style={styles.detailValue}>{fmt(result.corrUnitPrice * result.totalUnits)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Piezas seleccionadas</Text>
              <Text style={styles.detailValue}>{fmt(result.partsSum)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gasto de urea</Text>
              <Text style={styles.detailValue}>{fmt(result.ureaCost)}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Inoperatividad</Text>
              <Text style={styles.detailValue}>{fmt(result.downtimeCost)}</Text>
            </View>
          </View>
          <View style={[styles.detailCard, { marginRight: 0 }]}>
            <Text style={styles.detailTitle}>Desglose preventivo</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Precio unitario</Text>
              <Text style={styles.detailValue}>{fmt(result.prevUnitPrice)}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Total preventivo</Text>
              <Text style={styles.detailValue}>{fmt(result.totalPrev)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.barWrap}>
          <View style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text>Correctivo</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{fmt(result.totalCorr)}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${corrPct}%`, backgroundColor: "#dc2626" }]} />
            </View>
          </View>
          <View style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text>Preventivo</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{fmt(result.totalPrev)}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${prevPct}%`, backgroundColor: "#f6b31c" }]} />
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          El servicio preventivo reduce el riesgo de fallas, paros inesperados y costos acumulados por reparación. La
          cotización correctiva considera gastos adicionales de piezas, urea e inoperatividad cuando aplican.
          Inoperatividad estimada con base en horas de paro por unidad × tarifa por hora × número de unidades.
          Precios en pesos mexicanos (MXN), sujetos a cambio sin previo aviso.
        </Text>

        <PdfFooter pageLabel="Cotización" />
      </Page>
    </Document>
  );
}
