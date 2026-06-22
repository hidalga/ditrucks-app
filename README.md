# Ditrucks — Sistema de Gestión Técnica

Sistema de órdenes de servicio, archivos ECU, evidencia técnica, diagnóstico preventivo de sistemas post-tratamiento diésel (DPF, EGR, SCR/AdBlue), firma digital, certificados y portal de clientes.

## Stack Técnico

- **Frontend/Backend:** Next.js 16 + TypeScript + React 19
- **CSS:** Tailwind CSS 4
- **ORM:** Prisma 7
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT (jose) + bcrypt + cookies HttpOnly
- **Validación:** Zod
- **Iconos:** Lucide React

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu conexión PostgreSQL y secretos

# 3. Crear base de datos y aplicar esquema
npx prisma generate
npx prisma db push

# 4. Sembrar datos demo
npx prisma db seed

# 5. Iniciar desarrollo
npm run dev
```

## Usuarios Demo

| Correo | Contraseña | Rol |
|---|---|---|
| admin@ditrucks.com | admin123 | Administrador |
| tecnico@ditrucks.com | tech123 | Técnico |
| calibrador@ditrucks.com | calib123 | Calibrador |
| ventas@ditrucks.com | sales123 | Comercial |
| cliente@transnorte.com | cliente123 | Portal Cliente/Flotilla |

## Módulos V1

- Dashboard con estadísticas en tiempo real
- Empresas, Clientes, Vehículos (CRUD completo)
- Órdenes de servicio con 18 estados de flujo
- Archivos ECU con trazabilidad (herramienta, método, checksum)
- Evidencia fotográfica con categorías y separación marketing/cliente
- Diagnóstico DPF/SCR/EGR con motor de rating (0-100)
- Detalle de penalizaciones por sistema
- Administración de usuarios y roles
- Auditoría básica

## Módulos V2

### Firma Digital
- **Firma presencial**: Canvas touch/mouse para firma en tablet o celular
- **Firma remota**: Enlace seguro con token (72h expiración), sin cuenta necesaria
- **Snapshot legal**: JSON completo de la orden al momento de la firma
- **Página pública** `/sign/[token]`: Muestra datos de recepción + canvas de firma
- **Términos de autorización**: Versionados, el cliente acepta antes de firmar

### Certificados de Trabajo
- **Generación automática**: Número secuencial CERT-YYYY-NNNNNN
- **Token público**: URL verificable para cada certificado
- **Página de verificación** `/verify/[token]`: Muestra datos del trabajo (sin info sensible)
- **Estados**: borrador → generado → publicado → revocado
- **Revocación**: Solo admin, con motivo registrado

### Portal Cliente/Flotillero
- **Roles**: customer, fleet_admin (acceso limitado a su empresa)
- **Dashboard**: Estadísticas de vehículos, trabajos, certificados, riesgo
- **Vehículos**: Lista con score de salud y nivel de riesgo
- **Detalle de vehículo**: Historial de trabajos, diagnósticos, certificados
- **Órdenes cerradas**: Solo órdenes completadas (sin notas internas ni archivos ECU)
- **Certificados**: Lista y verificación pública
- **Sin acceso a**: Archivos ECU, notas internas, datos de otros clientes

### Integración CRM (Webhook)
- **Inbound** `POST /api/webhooks/crm/inbound`: Recibe datos de empresa, contacto, vehículo, deal
  - Deduplicación por `external_crm_deal_id`
  - Upsert inteligente (no sobreescribe datos técnicos)
  - WebhookLog completo
- **Outbound**: Eventos automáticos a URLs configurables
  - service_order.created, status_changed, signed, certificate_generated, etc.
  - Payload seguro (sin archivos ECU ni info sensible)
  - Fire-and-forget con logging

### Progreso de Orden
- 18 estados con porcentaje de progreso (5% → 100%)
- Etiquetas CRM (crm_tag) para cada estado
- Siguiente acción sugerida
- Barra visual en lista de órdenes

## Motor de Rating

Score base: 100/sistema. Promedio ponderado de sistemas presentes.
5 niveles: Excelente (85-100), Bueno (70-84), Medio (50-69), Alto (30-49), Crítico (0-29).

## Comandos

```bash
npm run dev           # Desarrollo
npm run build         # Build producción
npm run db:push       # Aplicar esquema
npm run db:seed       # Datos demo
npm run db:studio     # Prisma Studio
```

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/login/          # Login
│   ├── (dashboard)/           # Panel interno (admin, técnico, calibrador, comercial)
│   │   ├── dashboard/
│   │   ├── orders/[id]/       # Detalle con 8 pestañas
│   │   ├── companies/
│   │   ├── customers/
│   │   ├── vehicles/
│   │   ├── diagnostics/
│   │   └── users/
│   ├── (client)/client/       # Portal cliente/flotillero
│   │   ├── dashboard/
│   │   ├── vehicles/[id]/
│   │   ├── orders/[id]/
│   │   └── certificates/
│   ├── sign/[token]/          # Firma remota pública
│   ├── verify/[token]/        # Verificación pública de certificado
│   └── api/
│       ├── auth/
│       ├── orders/[id]/
│       │   ├── status/
│       │   ├── signature/remote/
│       │   ├── certificate/
│       │   ├── files/
│       │   └── evidence/
│       ├── public/sign/[token]/
│       ├── public/verify/[token]/
│       ├── client/
│       └── webhooks/crm/inbound/
├── components/
├── lib/
└── services/
    ├── order-progress.ts
    ├── signature.ts
    ├── certificate.ts
    ├── crm-webhook.ts
    ├── rating-engine.ts
    └── folio.ts
```

## Seguridad

- JWT con cookies HttpOnly
- Tokens de firma hasheados (SHA-256) con expiración
- Snapshot legal al firmar (JSON de la orden en el momento)
- Roles con acceso granular
- Portal cliente NO expone: archivos ECU, notas internas, datos de otros clientes
- Página pública de verificación NO expone: info sensible de calibración
- WebhookLog para auditoría de integraciones
- AuditLog para acciones críticas
