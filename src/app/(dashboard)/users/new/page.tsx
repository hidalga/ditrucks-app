"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Card, PageHeader } from "@/components/ui";
import { ROLE_LABELS, CLIENT_ROLES } from "@/lib/constants";

export default function NewUserPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(params.get("role") || "technician");
  const [companyId, setCompanyId] = useState(params.get("companyId") || "");
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/companies").then(r => r.json()).then(setCompanies).catch(() => {});
  }, []);

  const isClientRole = CLIENT_ROLES.includes(role);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      role,
      active: true,
    };
    if (isClientRole && companyId) data.companyId = companyId;

    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json(); setError(err.error || "Error al crear"); return; }
      router.push("/users");
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  const roleOptions = Object.entries(ROLE_LABELS)
    .filter(([v]) => v !== "fleet_customer_future")
    .map(([v, l]) => ({ value: v, label: l }));

  return (
    <>
      <PageHeader title="Nuevo Usuario" breadcrumbs={[{ label: "Usuarios", href: "/users" }, { label: "Nuevo" }]} />
      <Card className="max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Nombre *" placeholder="Nombre completo" required defaultValue={params.get("name") || ""} />
          <Input name="email" label="Correo *" type="email" placeholder="correo@empresa.com" required defaultValue={params.get("email") || ""} />
          <Input name="password" label="Contraseña *" type="password" placeholder="Mínimo 6 caracteres" required />

          <div>
            <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wider mb-1.5">Rol</label>
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent outline-none">
              {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {isClientRole && (
            <div>
              <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wider mb-1.5">Empresa *</label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent outline-none" required>
                <option value="">Seleccionar empresa...</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-xs text-brand-text-dim mt-1">El usuario solo verá datos de esta empresa en el portal.</p>
            </div>
          )}

          {isClientRole && (
            <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-lg p-3">
              <p className="text-xs text-brand-accent">Este usuario tendrá acceso al portal de clientes. Podrá ver vehículos, trabajos cerrados, diagnósticos y certificados de su empresa.</p>
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Crear Usuario</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
