"use client";
import { useParams } from "next/navigation";
import { Loading } from "@/components/ui";

export default function ClientCertificateDetail() {
  const { id } = useParams<{ id: string }>();
  return <div className="text-center py-12"><p className="text-gray-500">Detalle del certificado {id}</p><p className="text-sm text-gray-400 mt-2">Usa el enlace de verificación para ver la información completa.</p></div>;
}
