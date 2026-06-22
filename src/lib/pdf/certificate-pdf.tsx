import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfFooter, pdfStyles } from "./letterhead";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 12 },
  badgeText: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  certNumber: { fontSize: 13, color: "#b8860b", fontFamily: "Helvetica-Bold", marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#b8860b", textTransform: "uppercase", marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  rowLabel: { fontSize: 9, color: "#64748b", width: 140 },
  rowValue: { fontSize: 9, color: "#1e293b", flex: 1, fontFamily: "Helvetica-Bold" },
  paragraph: { fontSize: 9, color: "#334155", marginTop: 4, lineHeight: 1.5 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  chip: { backgroundColor: "#fef3c7", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, marginRight: 6, marginBottom: 6 },
  chipText: { fontSize: 8, color: "#b8860b" },
  verifyBox: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 10, marginTop: 16 },
  verifyText: { fontSize: 8, color: "#64748b" },
  verifyUrl: { fontSize: 9, color: "#b8860b", marginTop: 2, fontFamily: "Helvetica-Bold" },
});

export interface CertificatePdfProps {
  certificateNumber: string;
  status: "draft" | "generated" | "published" | "revoked";
  vehicle: { brand: string; model: string; year: number | null; vin: string | null; plates: string | null; economicNumber: string | null };
  companyName: string | null;
  orderFolio: string | null;
  serviceDate: string | null;
  deliveryDate: string | null;
  technician: string | null;
  workSummary: string | null;
  diagnosticSummary: string | null;
  finalResult: string | null;
  systemsWorked: string[];
  issuedAt: string | null;
  verifyUrl: string;
}

export function CertificatePdf(props: CertificatePdfProps) {
  const isRevoked = props.status === "revoked";

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader subtitle="Certificado de Trabajo" />

        <View style={[styles.badge, { backgroundColor: isRevoked ? "#fee2e2" : "#dcfce7" }]}>
          <Text style={[styles.badgeText, { color: isRevoked ? "#991b1b" : "#15803d" }]}>
            {isRevoked ? "Certificado Revocado" : "Certificado Válido"}
          </Text>
        </View>

        <Text style={styles.title}>Certificado de Trabajo</Text>
        <Text style={styles.certNumber}>{props.certificateNumber}</Text>

        <Text style={styles.sectionTitle}>Información del Trabajo</Text>
        <InfoRow label="Orden de servicio" value={props.orderFolio} />
        <InfoRow label="Empresa" value={props.companyName} />
        <InfoRow label="Fecha de servicio" value={props.serviceDate} />
        <InfoRow label="Fecha de entrega" value={props.deliveryDate} />
        <InfoRow label="Técnico" value={props.technician} />

        <Text style={styles.sectionTitle}>Vehículo</Text>
        <InfoRow label="Unidad" value={`${props.vehicle.brand} ${props.vehicle.model} ${props.vehicle.year || ""}`} />
        <InfoRow label="VIN" value={props.vehicle.vin} />
        <InfoRow label="Placas" value={props.vehicle.plates} />
        <InfoRow label="No. Económico" value={props.vehicle.economicNumber} />

        <Text style={styles.sectionTitle}>Trabajo Realizado</Text>
        {props.workSummary && <Text style={styles.paragraph}>{props.workSummary}</Text>}
        {props.systemsWorked.length > 0 && (
          <View style={styles.chipsRow}>
            {props.systemsWorked.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{SERVICE_TYPE_LABELS[s] || s}</Text>
              </View>
            ))}
          </View>
        )}
        <InfoRow label="Resultado" value={props.finalResult} />
        <InfoRow label="Diagnóstico" value={props.diagnosticSummary} />

        <Text style={styles.sectionTitle}>Emisión</Text>
        <InfoRow label="Fecha de emisión" value={props.issuedAt} />

        <View style={styles.verifyBox}>
          <Text style={styles.verifyText}>Verifica la autenticidad de este certificado en:</Text>
          <Text style={styles.verifyUrl}>{props.verifyUrl}</Text>
        </View>

        <PdfFooter pageLabel="Certificado de Trabajo" />
      </Page>
    </Document>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
