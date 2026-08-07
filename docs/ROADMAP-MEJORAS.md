# Roadmap de Mejoras — Sistema Ditrucks

**Versión del documento:** 1.0 · Agosto 2026
**Enfoque:** operativo (eficiencia del taller) y comercial (aumento de ganancias)

Cada mejora indica: impacto esperado, esfuerzo estimado y el KPI que debería mover.
Las versiones son una propuesta de orden; pueden re-priorizarse según el negocio.

---

## Estado actual (v1.0 — línea base)

Ya implementado y funcionando:
- Órdenes de servicio con 19 estados, % de avance y siguiente acción.
- Firmas electrónicas presencial/remota (recepción y entrega) con tokens de un solo uso.
- Certificados con verificación pública QR.
- Archivos ECU versionados con checksum y respaldo en Cloudflare R2.
- Diagnósticos con score automático 0–100 (DPF/SCR/EGR), penalizaciones explicables y proyección de deterioro por tipo de uso.
- Portal de clientes: semáforo de flota, trabajos, certificados, reporte PDF.
- Cotizador preventivo vs correctivo: catálogo de 326 vehículos auto-provisionado, piezas de post-tratamiento con esenciales, horizonte de proyección DEF, PDF.
- Pipeline comercial sobre diagnósticos (Seguimiento → Cotizar → Agendar → Vendido/Perdido).
- Dashboard operativo: órdenes estancadas +3 días, ciclo promedio, cerradas del mes.
- Analítica interna (BI) v1: resumen mensual + captura de eventos clave (ver módulo `/analytics`).
- Webhooks CRM bidireccionales, auditoría de acciones, roles por área.

---

## v1.1 — Cerrar el ciclo de venta (corto plazo)

### 1.1.1 Persistencia de cotizaciones ⭐ prioridad #1
**Problema:** el cotizador genera un PDF y no queda registro; no se sabe qué se cotizó, a quién, ni si se vendió.
**Propuesta:** modelo `Quote` (empresa/cliente, aplicación, parámetros, totales, vendedor, estado: borrador → enviada → aceptada → rechazada → convertida en orden).
- Historial por cliente y por vendedor.
- **Link público compartible** (misma infraestructura de tokens que firmas/certificados): el cliente ve la cotización interactiva y el sistema registra si la abrió.
- Conversión cotización → orden con un clic.
**Impacto:** alto (comercial) · **Esfuerzo:** medio · **KPI:** tasa de conversión cotización→orden, monto cotizado/mes (ya visible en BI).

### 1.1.2 Solicitud de servicio desde el portal
**Problema:** el cliente ve su unidad en rojo pero el único canal es una llamada.
**Propuesta:** botón "Solicitar servicio" en la unidad → crea una pre-orden/lead (unidad, motivo, urgencia) visible en el dashboard interno y en el pipeline.
**Impacto:** alto (lead capture con costo cero) · **Esfuerzo:** bajo-medio · **KPI:** leads entrantes/mes, tiempo de respuesta.

### 1.1.3 Accionar `nextCheckDate` (revisiones vencidas)
**Problema:** los diagnósticos guardan fecha de próxima revisión pero nada la usa.
**Propuesta:** bloque "Revisiones vencidas / por vencer (30 días)" en dashboard interno = lista de llamadas diaria para comercial.
**Impacto:** medio-alto · **Esfuerzo:** bajo · **KPI:** re-contacto de clientes, órdenes recurrentes.

---

## v1.2 — Comunicación y operación (mediano plazo)

### 1.2.1 Notificaciones por correo
**Problema:** el sistema es 100 % "pull"; nadie se entera si no entra a ver.
**Momentos críticos:** firma pendiente (al cliente), orden estancada +3 días (al responsable), archivo listo para instalar (al técnico), revisión vencida (a comercial).
**Impacto:** alto (multiplica el valor de todo lo demás) · **Esfuerzo:** medio · **KPI:** tiempo de firma, tiempo de ciclo.

### 1.2.2 Vista Kanban de órdenes
**Problema:** 19 estados no se gestionan bien en una tabla.
**Propuesta:** tablero por fases agrupadas (Recepción / Diagnóstico / Calibración / Instalación / Entrega) con tarjetas por técnico.
**Impacto:** medio-alto (operativo) · **Esfuerzo:** medio · **KPI:** órdenes estancadas, carga por técnico.

### 1.2.3 Historial de score por vehículo (tendencia)
**Problema:** se guardan todos los diagnósticos pero solo se muestra el último.
**Propuesta:** gráfica de evolución del score por unidad (interno y portal). *"Tu unidad bajó de 82 a 61 en 4 meses"* vende el preventivo solo.
**Impacto:** alto (comercial, confianza) · **Esfuerzo:** bajo-medio · **KPI:** conversión de oportunidades.

### 1.2.4 Recuperación de contraseña
Flujo de reset por correo con token temporal (misma infraestructura de tokens).
**Impacto:** medio (fricción del portal) · **Esfuerzo:** bajo.

### 1.2.5 Importación masiva de vehículos (CSV/Excel)
Alta de flotas completas con vinculación automática al catálogo del cotizador por marca/motor.
**Impacto:** medio (onboarding de clientes nuevos) · **Esfuerzo:** medio.

### 1.2.6 Backup automático de base de datos
`pg_dump` programado (tarea diaria) con retención de 14–30 días y copia fuera del servidor (p. ej. bucket R2 ya contratado).
**Impacto:** crítico (continuidad) · **Esfuerzo:** bajo.

---

## v2.0 — Inteligencia y escala (largo plazo)

### 2.0.1 BI fase 2: funnels y alertas
Sobre la captura de eventos de v1:
- **Funnel comercial completo:** diagnóstico → oportunidad → cotización → orden → certificado (tasas de conversión por etapa y por vendedor).
- **Alertas automáticas:** caída de conversión, aumento de tiempo de ciclo, cliente sin actividad en N días.
- **Comparativos periodo vs periodo** y exportación a Excel.
- **Rentabilidad por tipo de servicio** (requiere capturar precio/venta en la orden — hoy no se registra monto).

### 2.0.2 Registro de montos en órdenes
Prerequisito del punto anterior: campo de precio de venta (y costo opcional) por orden/servicio para reportar ingresos reales, no solo volumen.
**Impacto:** alto (BI de ganancias reales) · **Esfuerzo:** bajo-medio.

### 2.0.3 WhatsApp Business API
Enlaces de firma, avisos de estado y recordatorios de revisión directo al teléfono del cliente (canal natural en el sector).

### 2.0.4 Agenda / citas de taller
Calendario de capacidad por técnico y bahía; la oportunidad "Agendar" del pipeline crea cita real.

### 2.0.5 PWA / modo taller para técnicos
Interfaz optimizada para tablet en piso de taller (fotos rápidas, checklists, offline parcial).

### 2.0.6 Multi-sucursal
Si el negocio abre más ubicaciones: sucursal en órdenes/usuarios y filtros de BI por sucursal.

---

## Módulo de Analítica (BI) — referencia técnica v1

**Objetivo:** datos crudos y funcionales para decisiones que aumenten ganancias.

**Qué captura hoy:**
| Fuente | Datos |
|---|---|
| Órdenes (BD) | Creadas/cerradas por mes, ciclo promedio, vehículos más trabajados, tipos de servicio más solicitados |
| Diagnósticos (BD) | Volumen mensual, distribución de riesgo, score promedio, fallas más penalizadas |
| Eventos (`analytics_events`) | Exportaciones de PDF del cotizador (interno y portal, con vehículo y ahorro mostrado), selección de vehículo en cotizador, CTAs del portal cliente (llamar asesor / ver cotizador / reporte PDF), cambios de oportunidad |

**Diseño de la captura de eventos:**
- Tabla `analytics_events`: `event`, `userId`, `userRole`, `companyId`, `path`, `metadata` (JSON), `createdAt`. Indexada por evento+fecha.
- Endpoint `POST /api/analytics/track` *fire-and-forget*: nunca bloquea ni rompe la UI; si falla, se descarta en silencio.
- Helper `track(evento, metadata)` en cliente (usa `sendBeacon`).
- Eventos de servidor (ej. PDF del cotizador) se registran en la propia API — cubren interno y portal sin duplicar código.
- **Principio:** capturar solo botones/acciones con valor de decisión, no todo clic. Agregar un evento nuevo = 1 línea con `track()`.

**Convención de nombres de eventos:** `area_accion_objeto` en snake_case, p. ej. `quoter_pdf_export`, `client_cta_call_advisor`. Documentar cada evento nuevo en este archivo.

**Eventos sugeridos a futuro:** apertura de link de cotización (v1.1.1), solicitud de servicio del portal (v1.1.2), llamadas desde revisiones vencidas (v1.1.3), apertura de notificaciones (v1.2.1).
