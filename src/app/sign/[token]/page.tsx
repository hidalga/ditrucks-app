"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

type OrderData = {
  phase: "reception" | "delivery";
  folio: string;
  company: { name: string } | null;
  customer: { name: string } | null;
  vehicle: { brand: string; model: string; year?: number; vin?: string; plates?: string; economicNumber?: string; engine?: string };
  mileageAtReception?: number;
  engineHoursAtReception?: number;
  fuelLevel?: string;
  activeWarningLights?: string;
  activeFaults?: string;
  customerReportedFaults?: string;
  physicalDamageNotes?: string;
  generalObservations?: string;
  requestedServiceType?: string;
  serviceTypes: string[];
  technician?: string;
  workSummary?: string;
  deliveredAt?: string;
  certificateNumber?: string | null;
  diagnostic?: { generalHealthScore: number | null; riskLevel: string; dpfScore: number | null; scrScore: number | null; egrScore: number | null; dpfPresent: boolean; scrPresent: boolean; egrPresent: boolean; visibleRecommendation?: string } | null;
  terms?: { version: string; title: string; content: string } | null;
};

export default function PublicSignPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    fetch(`/api/public/sign/${token}`)
      .then(async (r) => { if (!r.ok) { const d = await r.json(); setError(d.error); return; } setData(await r.json()); })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "200px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [data]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e && e.touches.length > 0) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    if ("clientX" in e) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return { x: 0, y: 0 };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setIsDrawing(true); };
  const draw = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); if (!isDrawing) return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSignature(true); };
  const stopDraw = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); setIsDrawing(false); };

  const clearCanvas = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d")!; const dpr = window.devicePixelRatio || 1; ctx.clearRect(0, 0, c.width / dpr, c.height / dpr); setHasSignature(false); };

  const handleSign = async () => {
    if (!hasSignature || !signerName.trim() || !acceptedTerms) return;
    setSigning(true);
    try {
      const signatureData = canvasRef.current!.toDataURL("image/png");
      const res = await fetch(`/api/public/sign/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signatureData, signerName: signerName.trim(), signerRole: signerRole.trim() || null }) });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSigned(true);
    } catch { setError("Error al enviar firma"); }
    finally { setSigning(false); }
  };

  const scoreColor = (s: number | null) => { if (s === null) return "text-slate-400"; if (s >= 85) return "text-green-600"; if (s >= 70) return "text-blue-600"; if (s >= 50) return "text-amber-600"; if (s >= 30) return "text-orange-600"; return "text-red-600"; };

  if (loading) return <Shell><div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div></Shell>;
  if (error) return <Shell><div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-700 font-medium">{error}</p></div></Shell>;
  if (signed) return <Shell><div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center"><div className="text-4xl mb-3">✓</div><h2 className="text-xl font-bold text-green-800 mb-2">Firma registrada</h2><p className="text-green-700">La orden <strong>{data?.folio}</strong> ha sido firmada exitosamente. Puede cerrar esta ventana.</p></div></Shell>;
  if (!data) return null;

  const v = data.vehicle;
  const diag = data.diagnostic;
  const Row = ({ label, value }: { label: string; value?: string | number | null }) => value ? <div className="flex gap-2 py-1.5 border-b border-slate-100 last:border-0"><span className="text-slate-500 text-sm w-40 flex-shrink-0">{label}</span><span className="text-sm font-medium text-slate-800">{value}</span></div> : null;

  return (
    <Shell>
      <div className="text-center mb-6">
        <img src="/logo-black.svg" alt="Ditrucks" className="h-8 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900">{data.phase === "reception" ? "Firma de Recepción" : "Firma de Entrega"}</h1>
        <p className="text-[#b8860b] font-semibold text-lg">{data.folio}</p>
      </div>

      <div className="space-y-4">
        <Section title="Empresa / Cliente">
          <Row label="Empresa" value={data.company?.name} />
          <Row label="Contacto" value={data.customer?.name} />
        </Section>

        <Section title="Vehículo">
          <Row label="Unidad" value={`${v.brand} ${v.model} ${v.year || ""}`} />
          <Row label="VIN / Serie" value={v.vin} />
          <Row label="Placas" value={v.plates} />
          <Row label="No. Económico" value={v.economicNumber} />
          <Row label="Motor" value={v.engine} />
          {data.phase === "reception" && <Row label="Kilometraje" value={data.mileageAtReception?.toLocaleString()} />}
          {data.phase === "reception" && <Row label="Horómetro" value={data.engineHoursAtReception} />}
          {data.phase === "reception" && <Row label="Combustible" value={data.fuelLevel} />}
        </Section>

        {data.phase === "reception" ? (
          <Section title="Recepción">
            <Row label="Testigos activos" value={data.activeWarningLights} />
            <Row label="Fallas activas" value={data.activeFaults} />
            <Row label="Fallas reportadas" value={data.customerReportedFaults} />
            <Row label="Daños visibles" value={data.physicalDamageNotes} />
            <Row label="Observaciones" value={data.generalObservations} />
            <Row label="Servicio solicitado" value={data.requestedServiceType} />
            <Row label="Técnico" value={data.technician} />
          </Section>
        ) : (
          <Section title="Trabajo Realizado">
            <Row label="Resumen" value={data.workSummary} />
            <Row label="Servicios" value={data.serviceTypes?.join(", ")} />
            <Row label="Técnico" value={data.technician} />
            <Row label="Certificado" value={data.certificateNumber} />
          </Section>
        )}

        {/* Diagnostic snapshot, shown at either phase */}
        {diag && diag.generalHealthScore !== null && (
          <Section title={data.phase === "reception" ? "Estado de la Unidad al Momento de Recepción" : "Estado de la Unidad Después del Servicio"}>
            <div className="flex items-center gap-4 flex-wrap py-2">
              <div className="text-center"><span className={`text-2xl font-bold ${scoreColor(diag.generalHealthScore)}`}>{diag.generalHealthScore}</span><p className="text-[10px] text-slate-400 uppercase">General</p></div>
              {diag.dpfPresent && diag.dpfScore != null && <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.dpfScore)}`}>{diag.dpfScore}</span><p className="text-[10px] text-slate-400">DPF</p></div>}
              {diag.scrPresent && diag.scrScore != null && <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.scrScore)}`}>{diag.scrScore}</span><p className="text-[10px] text-slate-400">SCR</p></div>}
              {diag.egrPresent && diag.egrScore != null && <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.egrScore)}`}>{diag.egrScore}</span><p className="text-[10px] text-slate-400">EGR</p></div>}
            </div>
            {diag.visibleRecommendation && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mt-1">{diag.visibleRecommendation}</p>}
            <p className="text-xs text-slate-400 mt-2">{data.phase === "reception" ? "Los scores reflejan el estado de los sistemas post-tratamiento al momento de la recepción." : "Los scores reflejan el estado de los sistemas post-tratamiento al concluir el servicio."}</p>
          </Section>
        )}

        {data.terms && (
          <Section title={data.terms.title}>
            <p className="text-sm text-slate-600 leading-relaxed">{data.terms.content}</p>
          </Section>
        )}

        {/* Signature form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-4">{data.phase === "reception" ? "Firma de Autorización" : "Firma de Conformidad de Entrega"}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Nombre completo *</label>
              <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nombre de quien firma"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 text-sm text-slate-900 focus:ring-2 focus:ring-[#f6b31c]/40 focus:border-[#f6b31c] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Cargo (opcional)</label>
              <input type="text" value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="Gerente, operador..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 text-sm text-slate-900 focus:ring-2 focus:ring-[#f6b31c]/40 focus:border-[#f6b31c] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Firma *</label>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden touch-none bg-slate-50" style={{ height: 200 }}>
                <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} className="absolute inset-0 cursor-crosshair" />
                {!hasSignature && <p className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none">Firme aquí</p>}
              </div>
              <button onClick={clearCanvas} className="text-xs text-[#b8860b] mt-1 hover:underline cursor-pointer">Limpiar firma</button>
            </div>
            {data.terms && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="accent-[#f6b31c] mt-0.5" />
                <span className="text-sm text-slate-600">He leído y acepto los términos de autorización del servicio.</span>
              </label>
            )}
            <button onClick={handleSign} disabled={!hasSignature || !signerName.trim() || (!acceptedTerms && !!data.terms) || signing}
              className="w-full bg-[#f6b31c] text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d99a0b] transition-colors cursor-pointer">
              {signing ? "Firmando..." : "Aceptar y Firmar"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <img src="/logo-black.svg" alt="Ditrucks" className="h-4 mx-auto opacity-30" />
        <p className="text-xs text-slate-400 mt-1">Diesel Truck Solutions</p>
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
