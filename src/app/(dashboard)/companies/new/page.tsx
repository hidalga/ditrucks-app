"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea, Card, PageHeader } from "@/components/ui";
import { COMPANY_TYPE_LABELS } from "@/lib/constants";

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      legalName: fd.get("legalName") || null,
      rfc: fd.get("rfc") || null,
      phone: fd.get("phone") || null,
      email: fd.get("email") || null,
      address: fd.get("address") || null,
      primaryContact: fd.get("primaryContact") || null,
      companyType: fd.get("companyType"),
      notes: fd.get("notes") || null,
    };

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error al crear empresa");
        return;
      }

      const company = await res.json();
      router.push(`/companies/${company.id}`);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <>
      <PageHeader
        title="Nueva Empresa"
        breadcrumbs={[
          { label: "Empresas", href: "/companies" },
          { label: "Nueva" },
        ]}
      />

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="name" label="Nombre *" placeholder="Nombre de la empresa" required />
            <Input name="legalName" label="Razón Social" placeholder="Razón social" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="rfc" label="RFC" placeholder="RFC" />
            <Select name="companyType" label="Tipo de empresa" options={typeOptions} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="phone" label="Teléfono" placeholder="Teléfono" />
            <Input name="email" label="Correo" type="email" placeholder="correo@empresa.com" />
          </div>
          <Input name="address" label="Dirección" placeholder="Dirección" />
          <Input name="primaryContact" label="Contacto principal" placeholder="Nombre del contacto" />
          <Textarea name="notes" label="Notas" placeholder="Notas adicionales" />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Crear Empresa
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
