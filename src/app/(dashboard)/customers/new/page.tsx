"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Textarea, Card, PageHeader } from "@/components/ui";

export default function NewCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      companyId: fd.get("companyId") || null,
      phone: fd.get("phone") || null,
      email: fd.get("email") || null,
      position: fd.get("position") || null,
      notes: fd.get("notes") || null,
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); setError(err.error); return; }
      const customer = await res.json();
      router.push(`/customers/${customer.id}`);
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  const companyOptions = companies.map(c => ({ value: c.id, label: c.name }));
  const defaultCompany = searchParams.get("companyId") || "";

  return (
    <>
      <PageHeader title="Nuevo Cliente" breadcrumbs={[{label:"Clientes",href:"/customers"},{label:"Nuevo"}]} />
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Nombre *" placeholder="Nombre completo" required />
          <Select name="companyId" label="Empresa" options={companyOptions} placeholder="— Sin empresa —" defaultValue={defaultCompany} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="phone" label="Teléfono" placeholder="Teléfono" />
            <Input name="email" label="Correo" type="email" placeholder="correo@email.com" />
          </div>
          <Input name="position" label="Puesto" placeholder="Puesto o cargo" />
          <Textarea name="notes" label="Notas" placeholder="Notas" />
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Crear Cliente</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
