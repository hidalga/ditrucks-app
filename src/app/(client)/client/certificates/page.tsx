"use client";
import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { CERTIFICATE_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = { draft: "bg-slate-50 text-slate-600 border-slate-200", generated: "bg-blue-50 text-blue-700 border-blue-200", published: "bg-green-50 text-green-700 border-green-200", revoked: "bg-red-50 text-red-700 border-red-200" };

export default function ClientCertificatesPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/client/certificates").then(r => r.json()).then(setCerts).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Certificados</h1></div>
      {certs.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Award size={40} className="mx-auto mb-3 opacity-50" /><p>Sin certificados</p></div>
      ) : (
        <div className="space-y-3">
          {certs.map((c: any) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.certificateNumber}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{c.vehicle?.brand} {c.vehicle?.model} — {c.serviceOrder?.folio}</p>
                  {c.workSummary && <p className="text-sm text-slate-600 mt-1">{c.workSummary}</p>}
                  {c.systemsWorked?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {c.systemsWorked.map((s: string) => <span key={s} className="bg-[#f6b31c]/10 text-[#b8860b] text-xs px-2 py-0.5 rounded-full">{s}</span>)}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColors[c.status] || ""}`}>{CERTIFICATE_STATUS_LABELS[c.status]}</span>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(c.issuedAt)}</p>
                  {c.publicToken && <a href={`/verify/${c.publicToken}`} target="_blank" className="text-xs text-[#b8860b] hover:underline block mt-1">Verificar →</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
