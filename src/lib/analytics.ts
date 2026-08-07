"use client";

/**
 * Captura de eventos de analítica (BI interno) — lado cliente.
 *
 * Fire-and-forget: nunca bloquea ni rompe la UI. Usa sendBeacon para que el
 * evento sobreviva incluso a navegaciones/cierres de pestaña.
 *
 * Convención de nombres: area_accion_objeto (snake_case).
 *   quoter_vehicle_selected, client_cta_call_advisor, client_fleet_report_pdf...
 * Documenta los eventos nuevos en docs/ROADMAP-MEJORAS.md.
 */
export function track(event: string, metadata?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ event, metadata, path: window.location.pathname });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/analytics/track", blob)) return;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silencioso por diseño: la analítica jamás debe afectar la operación.
  }
}
