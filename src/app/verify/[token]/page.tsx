"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function VerifyCertificatePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/verify/${token}`)
      .then(async (r) => { if (!r.ok) { setError("Certificado no encontrado"); return; } setData(await r.json()); })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Shell><div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div></Shell>;
  if (error) return <Shell><div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center"><div className="text-4xl mb-3">✕</div><p className="text-red-700 font-medium">{error}</p></div></Shell>;
  if (!data) return null;

  const isRevoked = data.status === "revoked";
  const v = data.vehicle;
  const Row = ({ label, value }: { label: string; value?: string | number | null }) => value ? (
    <div className="flex gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-sm w-36 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  ) : null;

  return (
    <Shell>
      <div className="text-center mb-6">
        <img src="/logo-black.svg" alt="Ditrucks" className="h-8 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900">Verificación de Certificado</h1>
      </div>

      {/* Status badge */}
      <div className={`rounded-xl p-6 text-center mb-4 ${isRevoked ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
        <div className="text-4xl mb-2">{isRevoked ? "✕" : "✓"}</div>
        <p className={`text-lg font-bold ${isRevoked ? "text-red-700" : "text-green-700"}`}>
          {isRevoked ? "Certificado Revocado" : "Certificado Válido"}
        </p>
        <p className="text-2xl font-bold text-slate-900 mt-2">{data.certificateNumber}</p>
        {isRevoked && data.revokedReason && <p className="text-sm text-red-600 mt-2">Motivo: {data.revokedReason}</p>}
        {!isRevoked && (
          <a
            href={`/api/public/verify/${token}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-4 py-2 bg-[#f6b31c] text-white font-medium text-sm rounded-lg hover:bg-[#d99a0b] transition-colors"
          >
            Descargar PDF
          </a>
        )}
      </div>

      <div className="space-y-4">
        <Section title="Información del Trabajo">
          <Row label="Orden de servicio" value={data.orderFolio} />
          <Row label="Empresa" value={data.company} />
          <Row label="Fecha de servicio" value={data.serviceDate ? new Date(data.serviceDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : null} />
          <Row label="Fecha de entrega" value={data.deliveryDate ? new Date(data.deliveryDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : null} />
          <Row label="Técnico" value={data.technician} />
        </Section>

        <Section title="Vehículo">
          <Row label="Unidad" value={`${v.brand} ${v.model} ${v.year || ""}`} />
          <Row label="VIN" value={v.vin} />
          <Row label="Placas" value={v.plates} />
          <Row label="No. Económico" value={v.economicNumber} />
        </Section>

        <Section title="Trabajo Realizado">
          {data.workSummary && <p className="text-sm text-slate-700 mb-2">{data.workSummary}</p>}
          {data.systemsWorked?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {data.systemsWorked.map((s: string) => <span key={s} className="bg-[#f6b31c]/10 text-[#b8860b] text-xs font-medium px-2.5 py-1 rounded-full">{s}</span>)}
            </div>
          )}
          <Row label="Resultado" value={data.finalResult} />
          <Row label="Diagnóstico" value={data.diagnosticSummary} />
        </Section>

        <Section title="Emisión">
          <Row label="Emitido por" value={data.issuer} />
          <Row label="Fecha emisión" value={data.issuedAt ? new Date(data.issuedAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : null} />
        </Section>
      </div>

      <div className="mt-6 text-center">
        <img src="/logo-black.svg" alt="Ditrucks" className="h-4 mx-auto opacity-30" />
        <p className="text-xs text-slate-400 mt-1">Este certificado fue emitido por Ditrucks. La información mostrada es de carácter informativo.</p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 py-6 px-4"><div className="max-w-lg mx-auto">{children}</div></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><h3 className="text-xs font-semibold text-[#b8860b] uppercase tracking-wider mb-2">{title}</h3>{children}</div>;
}
