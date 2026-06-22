"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Eraser, Check, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string, name: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function SignaturePad({
  onSave,
  onCancel,
  title = "Firma del cliente",
  description = "Firme dentro del recuadro para autorizar la información capturada.",
  loading,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState("");

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    if ("clientX" in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Exportar como PNG en base64
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl, signerName);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-brand-accent uppercase tracking-wider">
          {title}
        </h3>
        <p className="text-xs text-brand-text-dim mt-1">{description}</p>
      </div>

      {/* Signer name */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wide">
          Nombre de quien firma
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Nombre completo"
          className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-48 sm:h-56 bg-brand-darker border-2 border-dashed border-brand-border rounded-xl overflow-hidden touch-none"
      >
        {/* Guide line */}
        <div className="absolute bottom-12 left-6 right-6 border-b border-brand-border/40" />
        <span className="absolute bottom-7 left-6 text-[10px] text-brand-text-dim/40 select-none">
          Firma aquí
        </span>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 cursor-crosshair"
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-brand-text-dim/30 text-sm select-none">
              Toque y arrastre para firmar
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          disabled={!hasSignature}
        >
          <RotateCcw size={14} /> Limpiar
        </Button>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!hasSignature || !signerName.trim()}
            loading={loading}
          >
            <Check size={14} /> Guardar Firma
          </Button>
        </div>
      </div>

      {!signerName.trim() && hasSignature && (
        <p className="text-xs text-amber-400">Ingresa el nombre de quien firma para continuar.</p>
      )}
    </div>
  );
}

// ─── SIGNATURE DISPLAY ──────────────────────────────────
interface SignatureDisplayProps {
  dataUrl: string;
  name: string;
  date: string;
  label: string;
}

export function SignatureDisplay({ dataUrl, name, date, label }: SignatureDisplayProps) {
  return (
    <div className="bg-brand-surface2 rounded-xl p-4">
      <p className="text-xs font-medium text-brand-text-muted uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="bg-brand-darker rounded-lg p-3 border border-brand-border">
        <img
          src={dataUrl}
          alt={`Firma de ${name}`}
          className="w-full h-24 sm:h-32 object-contain"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium text-brand-text">{name}</span>
        <span className="text-brand-text-dim">
          {new Date(date).toLocaleDateString("es-MX", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
