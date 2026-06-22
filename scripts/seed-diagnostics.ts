import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROFILES = [
  { num: "TRC-005", dpf: 12, scr: 18, egr: 25, usage: "carga_pesada", risk: "critico", rec: "DPF saturado. Regeneración fallida. Intervención inmediata requerida.", days: 0 },
  { num: "TRC-026", dpf: 8, scr: 22, egr: 15, usage: "carretera", risk: "critico", rec: "Derate activo por falla múltiple DPF/EGR. Servicio urgente.", days: 0 },
  { num: "TRC-029", dpf: 15, scr: 10, egr: 28, usage: "carretera", risk: "critico", rec: "SCR en falla crítica, inyector DEF obstruido. Servicio urgente.", days: 0 },
  { num: "TRC-034", dpf: 20, scr: 25, egr: 10, usage: "carga_pesada", risk: "critico", rec: "EGR completamente obstruido. Limitación de potencia activa.", days: 0 },
  { num: "TRC-003", dpf: 32, scr: 38, egr: 35, usage: "mixto", risk: "alto", rec: "Sistemas en deterioro avanzado. Agendar intervención preventiva.", days: 14 },
  { num: "TRC-010", dpf: 40, scr: 28, egr: 33, usage: "reparto_urbano", risk: "alto", rec: "EGR con acumulación severa. SCR pierde eficiencia.", days: 10 },
  { num: "TRC-027", dpf: 35, scr: 42, egr: 30, usage: "carretera", risk: "alto", rec: "Desgaste acelerado por alto kilometraje. Intervención recomendada.", days: 7 },
  { num: "TRC-030", dpf: 38, scr: 30, egr: 35, usage: "carretera", risk: "alto", rec: "Múltiples DTCs de post-tratamiento. Intervención antes de falla mayor.", days: 14 },
  { num: "TRC-001", dpf: 52, scr: 58, egr: 55, usage: "mixto", risk: "medio", rec: "Desgaste visible. Programar revisión en 60 días.", days: 60 },
  { num: "TRC-007", dpf: 65, scr: 48, egr: 60, usage: "reparto_urbano", risk: "medio", rec: "Sensor SCR intermitente. Monitorear calidad DEF.", days: 45 },
  { num: "TRC-008", dpf: 55, scr: 50, egr: 62, usage: "mixto", risk: "medio", rec: "DPF y SCR en rango medio. Revisión recomendada.", days: 45 },
  { num: "TRC-011", dpf: 58, scr: 62, egr: 52, usage: "reparto_urbano", risk: "medio", rec: "Desgaste normal. Próxima revisión en 8 semanas.", days: 56 },
  { num: "TRC-014", dpf: 60, scr: 55, egr: 58, usage: "ciudad", risk: "medio", rec: "Conducción urbana incrementa carga DPF. Monitorear.", days: 50 },
  { num: "TRC-017", dpf: 62, scr: 56, egr: 64, usage: "reparto_urbano", risk: "medio", rec: "Rango aceptable. Monitoreo en próximo servicio.", days: 60 },
  { num: "TRC-020", dpf: 55, scr: 60, egr: 50, usage: "ciudad", risk: "medio", rec: "EGR acumulación moderada. Limpieza preventiva recomendada.", days: 40 },
  { num: "TRC-023", dpf: 48, scr: 58, egr: 55, usage: "mixto", risk: "medio", rec: "DPF acercándose a rango bajo. Agendar limpieza.", days: 30 },
  { num: "TRC-025", dpf: 52, scr: 45, egr: 58, usage: "mixto", risk: "medio", rec: "SCR requiere atención próxima.", days: 35 },
  { num: "TRC-032", dpf: 60, scr: 50, egr: 65, usage: "mixto", risk: "medio", rec: "Sensor SCR intermitente. Diagnóstico detallado necesario.", days: 30 },
  { num: "TRC-033", dpf: 55, scr: 58, egr: 52, usage: "carretera", risk: "medio", rec: "Desgaste proporcional al uso. Revisión programada.", days: 45 },
  { num: "TRC-015", dpf: 65, scr: 52, egr: 60, usage: "ciudad", risk: "medio", rec: "Tendencia descendente. Monitorear.", days: 50 },
  { num: "TRC-002", dpf: 88, scr: 92, egr: 85, usage: "mixto", risk: "bueno", rec: "Excelente estado. Sin acción.", days: 120 },
  { num: "TRC-004", dpf: 78, scr: 82, egr: 75, usage: "mixto", risk: "bueno", rec: "Buen estado. Mantenimiento regular.", days: 90 },
  { num: "TRC-006", dpf: 92, scr: 95, egr: 90, usage: "reparto_urbano", risk: "excelente", rec: "Excelente. Unidad prácticamente nueva.", days: 180 },
  { num: "TRC-009", dpf: 95, scr: 97, egr: 93, usage: "reparto_urbano", risk: "excelente", rec: "Óptimo. Sin acción necesaria.", days: 180 },
  { num: "TRC-012", dpf: 82, scr: 78, egr: 80, usage: "mixto", risk: "bueno", rec: "Buen estado. Próxima revisión en 3 meses.", days: 90 },
  { num: "TRC-013", dpf: 75, scr: 80, egr: 72, usage: "ciudad", risk: "bueno", rec: "Funcional. Monitoreo regular.", days: 90 },
  { num: "TRC-016", dpf: 85, scr: 88, egr: 82, usage: "mixto", risk: "bueno", rec: "Muy buen estado.", days: 120 },
  { num: "TRC-018", dpf: 80, scr: 85, egr: 78, usage: "reparto_urbano", risk: "bueno", rec: "Buen estado para el uso.", days: 90 },
  { num: "TRC-019", dpf: 90, scr: 88, egr: 92, usage: "mixto", risk: "excelente", rec: "Todos los sistemas en rango óptimo.", days: 150 },
  { num: "TRC-021", dpf: 78, scr: 82, egr: 76, usage: "reparto_urbano", risk: "bueno", rec: "Estado adecuado.", days: 90 },
  { num: "TRC-022", dpf: 85, scr: 80, egr: 88, usage: "mixto", risk: "bueno", rec: "Buen funcionamiento general.", days: 100 },
  { num: "TRC-024", dpf: 96, scr: 94, egr: 95, usage: "carretera", risk: "excelente", rec: "Unidad nueva, óptimas condiciones.", days: 180 },
  { num: "TRC-028", dpf: 82, scr: 85, egr: 80, usage: "carretera", risk: "bueno", rec: "Buen estado para carretera.", days: 90 },
  { num: "TRC-031", dpf: 88, scr: 90, egr: 85, usage: "carretera", risk: "bueno", rec: "Muy buen estado.", days: 120 },
  { num: "TRC-035", dpf: 75, scr: 78, egr: 72, usage: "mixto", risk: "bueno", rec: "Funcional. Sin acción inmediata.", days: 90 },
  { num: "TRC-036", dpf: 80, scr: 76, egr: 82, usage: "reparto_urbano", risk: "bueno", rec: "Buen estado.", days: 90 },
  { num: "TRC-037", dpf: 88, scr: 85, egr: 90, usage: "mixto", risk: "bueno", rec: "Muy bien. Continuar operación.", days: 120 },
  { num: "TRC-038", dpf: 72, scr: 78, egr: 70, usage: "ciudad", risk: "bueno", rec: "Funcional. Monitorear tendencia.", days: 90 },
  { num: "TRC-039", dpf: 85, scr: 82, egr: 88, usage: "mixto", risk: "bueno", rec: "Buen estado general.", days: 100 },
  { num: "TRC-040", dpf: 90, scr: 92, egr: 87, usage: "carretera", risk: "excelente", rec: "Excelente condición.", days: 150 },
];

async function main() {
  console.log("🔬 Creando diagnósticos para la flota simulada...\n");

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) { console.error("No admin user found"); return; }

  const company = await prisma.company.findFirst({ where: { name: { contains: "Transportes Rapidos del Centro" }, deleted: false } });
  if (!company) { console.error("Company not found. Run: bash scripts/fleet-curls.sh"); return; }

  const vehicles = await prisma.vehicle.findMany({ where: { companyId: company.id, deleted: false } });
  console.log(`  Encontrados ${vehicles.length} vehículos para ${company.name}\n`);

  let created = 0;
  for (const p of PROFILES) {
    const vehicle = vehicles.find(v => v.economicNumber === p.num);
    if (!vehicle) { console.log(`  ⚠ ${p.num} no encontrado`); continue; }

    const order = await prisma.serviceOrder.findFirst({ where: { vehicleId: vehicle.id, deleted: false }, orderBy: { createdAt: "desc" } });
    if (!order) continue;

    const general = Math.round((p.dpf + p.scr + p.egr) / 3);
    const nextCheck = new Date(); nextCheck.setDate(nextCheck.getDate() + p.days);

    await prisma.diagnostic.create({
      data: {
        serviceOrderId: order.id, vehicleId: vehicle.id, technicianId: admin.id,
        dpfPresent: true, dpfScore: p.dpf, dpfDtcActive: p.dpf < 30,
        scrPresent: true, scrScore: p.scr, scrDtcActive: p.scr < 30,
        egrPresent: true, egrScore: p.egr, egrDtcActive: p.egr < 30,
        generalHealthScore: general, riskLevel: p.risk as any, usageType: p.usage as any,
        recommendation: p.rec, visibleRecommendation: p.rec, nextCheckDate: nextCheck,
      },
    });

    const status = (p.risk === "critico" || p.risk === "alto") ? "diagnostico_inicial" : "cerrada";
    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: { status, progressPercent: status === "cerrada" ? 100 : 35, progressLabel: status === "cerrada" ? "Cerrada" : "Diagnóstico Inicial" },
    });

    const icon = general >= 70 ? "🟢" : general >= 50 ? "🟡" : general >= 30 ? "🟠" : "🔴";
    console.log(`  ${icon} ${p.num} — ${vehicle.brand} ${vehicle.model} — Score: ${general} (${p.risk})`);
    created++;
  }

  // Create portal user
  const hash = await bcrypt.hash("cliente123", 12);
  await prisma.user.upsert({
    where: { email: "rmedina@transportesrapidos.mx" },
    update: {},
    create: { name: "Ing. Roberto Medina Flores", email: "rmedina@transportesrapidos.mx", passwordHash: hash, role: "fleet_admin", companyId: company.id },
  });

  console.log(`\n✅ ${created} diagnósticos creados`);
  console.log("\n📱 Portal cliente:");
  console.log("  Email: rmedina@transportesrapidos.mx");
  console.log("  Password: cliente123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
