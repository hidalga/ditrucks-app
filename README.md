# Ditrucks — Sistema de Gestión Técnica

Sistema de órdenes de servicio, archivos ECU, evidencia técnica y diagnóstico preventivo de sistemas post-tratamiento diésel (DPF, EGR, SCR/AdBlue).

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
# Editar .env con tu conexión PostgreSQL

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
|--------|-----------|-----|
| admin@ditrucks.com | admin123 | Administrador |
| tecnico@ditrucks.com | tech123 | Técnico |
| calibrador@ditrucks.com | calib123 | Calibrador |
| ventas@ditrucks.com | sales123 | Comercial |

## Módulos

- Dashboard con estadísticas en tiempo real
- Empresas, Clientes, Vehículos (CRUD completo)
- Órdenes de servicio con 11 estados de flujo
- Archivos ECU con trazabilidad (herramienta, método, checksum)
- Evidencia fotográfica con categorías y separación marketing/cliente
- Diagnóstico DPF/SCR/EGR con motor de rating (0-100)
- Detalle de penalizaciones por sistema
- Administración de usuarios y roles
- Auditoría básica

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
