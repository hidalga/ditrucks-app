/**
 * Aprovisionamiento de usuarios reales del sistema.
 *
 * Deja EXACTAMENTE los usuarios listados abajo (crea o actualiza, restableciendo
 * su contraseña) y elimina cualquier otro usuario. Si un usuario sobrante tiene
 * historial (órdenes, diagnósticos, etc.) no se puede borrar: se desactiva.
 *
 * Uso local:      npx tsx scripts/provision-users.ts
 * Uso en Railway: railway run npx tsx scripts/provision-users.ts
 *                 (o localmente con DATABASE_URL apuntando a la BD de Railway)
 *
 * ⚠️ Después de aprovisionar en producción, cambiar las contraseñas desde
 *    /users si se desea rotarlas.
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USERS: { name: string; email: string; role: UserRole; password: string }[] = [
  { name: "Karla Sánchez",   email: "karla.sanchez@ditrucks.com.mx",   role: "admin",      password: "eLRn6mBa92$" },
  { name: "Humberto Pérez",  email: "humberto.perez@ditrucks.com.mx",  role: "technician", password: "6JfkDV2gXH*" },
  { name: "Ignacio Camacho", email: "ignacio.camacho@ditrucks.com.mx", role: "technician", password: "AVtJ9dKLCm$" },
  { name: "Yaneri Orozco",   email: "yaneri.orozco@ditrucks.com.mx",   role: "sales",      password: "dTLWpccSAM*" },
  { name: "Bertha Sánchez",  email: "bertha.sanchez@ditrucks.com.mx",  role: "sales",      password: "pSfutpv4e4%" },
  { name: "Admin Ditrucks",  email: "admin@ditrucks.com.mx",           role: "admin",      password: "GmVTZYPf7J+" },
];

async function main() {
  console.log("👥 Aprovisionando usuarios reales...\n");

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, active: true },
      create: { name: u.name, email: u.email, role: u.role, passwordHash, active: true },
    });
    console.log(`  ✔ ${u.email} (${u.role})`);
  }

  const keep = USERS.map((u) => u.email);
  const others = await prisma.user.findMany({
    where: { email: { notIn: keep } },
    select: { id: true, email: true },
  });

  if (others.length > 0) console.log("");
  for (const o of others) {
    try {
      await prisma.user.delete({ where: { id: o.id } });
      console.log(`  🗑 eliminado: ${o.email}`);
    } catch {
      // Tiene registros vinculados (órdenes, diagnósticos, archivos...): solo desactivar
      await prisma.user.update({ where: { id: o.id }, data: { active: false } });
      console.log(`  ⏸ desactivado (tiene historial): ${o.email}`);
    }
  }

  console.log(`\n✅ Listo. Usuarios activos: ${keep.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
