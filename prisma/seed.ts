import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ──
  const adminHash = await bcrypt.hash("admin123", 12);
  const techHash = await bcrypt.hash("tech123", 12);
  const calibHash = await bcrypt.hash("calib123", 12);
  const salesHash = await bcrypt.hash("sales123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ditrucks.com" },
    update: {},
    create: {
      name: "Admin Ditrucks",
      email: "admin@ditrucks.com",
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const tech = await prisma.user.upsert({
    where: { email: "tecnico@ditrucks.com" },
    update: {},
    create: {
      name: "Carlos Hernández",
      email: "tecnico@ditrucks.com",
      passwordHash: techHash,
      role: "technician",
    },
  });

  const calibrator = await prisma.user.upsert({
    where: { email: "calibrador@ditrucks.com" },
    update: {},
    create: {
      name: "Miguel Ángel López",
      email: "calibrador@ditrucks.com",
      passwordHash: calibHash,
      role: "calibrator",
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: "ventas@ditrucks.com" },
    update: {},
    create: {
      name: "Laura Martínez",
      email: "ventas@ditrucks.com",
      passwordHash: salesHash,
      role: "sales",
    },
  });

  // ── Companies ──
  const company1 = await prisma.company.create({
    data: {
      name: "Transportes del Norte SA",
      legalName: "Transportes del Norte SA de CV",
      rfc: "TNO850101ABC",
      phone: "33 1234 5678",
      email: "contacto@transnorte.com",
      address: "Av. López Mateos 1500, Guadalajara, Jalisco",
      primaryContact: "Roberto García",
      companyType: "flotilla",
      notes: "Flotilla de 45 tractocamiones. Cliente prioritario.",
    },
  });

  const company2 = await prisma.company.create({
    data: {
      name: "Agrícola Los Pinos",
      phone: "33 9876 5432",
      email: "admin@lospinos.com",
      companyType: "agricola",
      notes: "Maquinaria agrícola John Deere.",
    },
  });

  const company3 = await prisma.company.create({
    data: {
      name: "Construcciones Reyes",
      rfc: "CRE920315XYZ",
      phone: "33 5555 1234",
      companyType: "construccion",
    },
  });

  // ── Customers ──
  const customer1 = await prisma.customer.create({
    data: {
      name: "Roberto García",
      companyId: company1.id,
      phone: "33 1234 5679",
      email: "roberto@transnorte.com",
      position: "Gerente de Flota",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "Pedro Sánchez",
      companyId: company2.id,
      phone: "33 8888 2222",
      position: "Encargado de Maquinaria",
    },
  });

  // ── Vehicles ──
  const vehicle1 = await prisma.vehicle.create({
    data: {
      companyId: company1.id,
      customerId: customer1.id,
      economicNumber: "TN-001",
      vin: "1XKYDP9X4MJ123456",
      plates: "JE-12345",
      brand: "Kenworth",
      model: "T680",
      year: 2022,
      engine: "Cummins ISX15",
      fuelType: "diesel",
      mileage: 185000,
      hourMeter: 4200,
      unitType: "tractocamion",
      knownEcu: "CM2350",
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      companyId: company1.id,
      customerId: customer1.id,
      economicNumber: "TN-007",
      vin: "3AKJHHDR5NSAB7890",
      plates: "JE-67890",
      brand: "Freightliner",
      model: "Cascadia",
      year: 2021,
      engine: "DD15",
      fuelType: "diesel",
      mileage: 240000,
      unitType: "tractocamion",
      knownEcu: "ACM",
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      companyId: company2.id,
      customerId: customer2.id,
      brand: "John Deere",
      model: "8R 370",
      year: 2020,
      engine: "6.8L PowerTech",
      fuelType: "diesel",
      hourMeter: 6500,
      unitType: "agricola",
    },
  });

  const vehicle4 = await prisma.vehicle.create({
    data: {
      companyId: company3.id,
      brand: "Caterpillar",
      model: "320 GC",
      year: 2023,
      engine: "Cat C4.4",
      fuelType: "diesel",
      hourMeter: 2100,
      unitType: "maquinaria",
    },
  });

  // ── Folio counter ──
  await prisma.folioCounter.upsert({
    where: { id: "folio_counter" },
    update: {},
    create: { id: "folio_counter", year: 2026, counter: 0 },
  });

  // ── Service Orders ──
  const order1 = await prisma.serviceOrder.create({
    data: {
      folio: "OS-2026-000001",
      companyId: company1.id,
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      technicianId: tech.id,
      assignedCalibratorId: calibrator.id,
      status: "en_analisis",
      serviceTypes: ["dpf", "egr"],
      receivedAt: new Date("2026-05-20T09:00:00"),
      mileageAtReception: 185000,
      engineHoursAtReception: 4200,
      fuelLevel: "3/4",
      activeWarningLights: "Check Engine, DPF",
      activeFaults: "P2002 - DPF efficiency below threshold\nP0401 - EGR flow insufficient",
      customerReportedFaults: "La unidad entra en modo limp constantemente. Testigo DPF encendido desde hace 2 semanas.",
      physicalDamageNotes: "Sin daños visibles.",
      generalObservations: "Se percibe exceso de humo negro en aceleración. Historial de regeneraciones fallidas.",
      requestedServiceType: "Diagnóstico y solución DPF/EGR",
      createdById: admin.id,
    },
  });

  // Update folio counter
  await prisma.folioCounter.update({
    where: { id: "folio_counter" },
    data: { counter: 1 },
  });

  const order2 = await prisma.serviceOrder.create({
    data: {
      folio: "OS-2026-000002",
      companyId: company1.id,
      customerId: customer1.id,
      vehicleId: vehicle2.id,
      technicianId: tech.id,
      status: "recepcion",
      serviceTypes: ["scr_adblue", "diagnostico"],
      receivedAt: new Date("2026-05-24T14:00:00"),
      mileageAtReception: 240000,
      activeWarningLights: "AdBlue, Derate",
      customerReportedFaults: "Unidad en derate. Bomba DEF posiblemente dañada.",
      createdById: tech.id,
    },
  });

  await prisma.folioCounter.update({
    where: { id: "folio_counter" },
    data: { counter: 2 },
  });

  const order3 = await prisma.serviceOrder.create({
    data: {
      folio: "OS-2026-000003",
      companyId: company2.id,
      vehicleId: vehicle3.id,
      technicianId: tech.id,
      status: "cerrada",
      serviceTypes: ["stage1_potencia"],
      receivedAt: new Date("2026-05-15T10:00:00"),
      deliveredAt: new Date("2026-05-17T16:00:00"),
      mileageAtReception: null,
      engineHoursAtReception: 6500,
      workSummary: "Stage 1 aplicado. Incremento de potencia y torque. Pruebas satisfactorias.",
      createdById: admin.id,
    },
  });

  await prisma.folioCounter.update({
    where: { id: "folio_counter" },
    data: { counter: 3 },
  });

  // ── ECU Files ──
  await prisma.ecuFile.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      uploadedById: tech.id,
      fileType: "original",
      fileName: "T680_CM2350_original.bin",
      fileExtension: ".bin",
      storageType: "mega_path",
      megaFolderPath: "/Mega/ECU/TransNorte/TN-001/Original",
      ecuBrand: "Cummins",
      ecuModel: "CM2350",
      toolUsed: "autotuner",
      readMethod: "obd",
      checksumStatus: "ok",
      versionNumber: 1,
      notes: "Lectura OBD sin problemas. Archivo verificado.",
    },
  });

  await prisma.ecuFile.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      uploadedById: calibrator.id,
      fileType: "modified",
      fileName: "T680_CM2350_mod_dpf_egr.bin",
      fileExtension: ".bin",
      storageType: "mega_path",
      megaFolderPath: "/Mega/ECU/TransNorte/TN-001/Modified",
      ecuBrand: "Cummins",
      ecuModel: "CM2350",
      toolUsed: "autotuner",
      checksumStatus: "corrected",
      versionNumber: 1,
      notes: "DPF y EGR programados. Checksum corregido. Listo para instalar.",
    },
  });

  // ── Diagnostics ──
  await prisma.diagnostic.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      technicianId: tech.id,
      scannerTool: "Jaltest",
      diagnosticDate: new Date("2026-05-20T10:30:00"),
      dtcActive: "P2002, P0401",
      dtcPending: "P244A",
      usageType: "carretera",
      generalSymptoms: "Modo limp frecuente, humo negro excesivo, regeneraciones fallidas.",

      dpfPresent: true,
      dpfDtcActive: true,
      sootLoadPercent: 82,
      ashLoadPercent: 45,
      differentialPressureHighRpm: 12.5,
      failedRegenerationsCount: 8,
      dpfNotes: "Carga de hollín muy alta. Regeneraciones fallidas constantes. Presión diferencial elevada.",
      dpfScore: 15,

      egrPresent: true,
      egrDtcActive: true,
      egrDeviation: 18,
      egrFlowNotes: "Flujo insuficiente detectado por escáner",
      egrNotes: "Carbonización severa en válvula EGR. Requiere limpieza o reemplazo.",
      egrScore: 20,

      scrPresent: false,

      generalHealthScore: 18,
      riskLevel: "critico",
      recommendation: "Se recomienda intervención técnica urgente. DPF con carga de hollín excesiva y múltiples regeneraciones fallidas. EGR con carbonización severa y flujo insuficiente. Opciones: limpieza profesional de DPF, reemplazo/limpieza de válvula EGR, y reprogramación para optimizar parámetros de regeneración según el uso en carretera de la unidad.",
      nextCheckDate: new Date("2026-08-20"),
      commercialOpportunityStatus: "cotizar",
      scorePenalties: JSON.stringify([
        { system: "DPF", reason: "DTC activo en DPF", points: 25 },
        { system: "DPF", reason: "8 regeneraciones fallidas", points: 20 },
        { system: "DPF", reason: "Presión diferencial alta a RPM elevado (12.5 kPa)", points: 18 },
        { system: "DPF", reason: "Carga de hollín elevada (82%)", points: 20 },
        { system: "EGR", reason: "DTC activo en EGR", points: 25 },
        { system: "EGR", reason: "Desviación EGR alta (18%)", points: 18 },
        { system: "EGR", reason: "Flujo EGR insuficiente/restringido", points: 20 },
        { system: "EGR", reason: "Carbonización/obstrucción severa en EGR", points: 15 },
      ]),
    },
  });

  await prisma.diagnostic.create({
    data: {
      serviceOrderId: order2.id,
      vehicleId: vehicle2.id,
      technicianId: tech.id,
      scannerTool: "Jaltest",
      diagnosticDate: new Date("2026-05-24T15:00:00"),
      dtcActive: "P20EE, P208F",
      usageType: "carretera",

      dpfPresent: true,
      dpfDtcActive: false,
      sootLoadPercent: 35,
      dpfScore: 90,

      scrPresent: true,
      scrDtcActive: true,
      scrDerateActive: true,
      defPumpPressure: 1.2,
      scrEfficiency: 42,
      defInjectorStatus: "Posible falla en inyector DEF",
      scrNotes: "Derate activo. Bomba DEF con presión muy baja. Eficiencia SCR crítica.",
      scrScore: 0,

      egrPresent: true,
      egrDtcActive: false,
      egrDeviation: 5,
      egrScore: 100,

      generalHealthScore: 63,
      riskLevel: "medio",
      recommendation: "Sistema SCR en estado crítico. Se requiere revisión urgente de bomba DEF (presión anormalmente baja) e inyector DEF. DPF y EGR en buen estado. Se recomienda reparación del sistema SCR para eliminar derate y restaurar operación normal.",
      nextCheckDate: new Date("2026-06-24"),
      commercialOpportunityStatus: "agendar",
      scorePenalties: JSON.stringify([
        { system: "SCR", reason: "DTC activo en SCR", points: 25 },
        { system: "SCR", reason: "Derate activo en SCR", points: 30 },
        { system: "SCR", reason: "Eficiencia SCR baja (42%)", points: 19 },
        { system: "SCR", reason: "Presión bomba DEF anormal (1.2 bar)", points: 25 },
        { system: "SCR", reason: "Problema detectado en inyector DEF", points: 20 },
      ]),
    },
  });

  // ── Evidence ──
  await prisma.evidence.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      uploadedById: tech.id,
      category: "recepcion",
      filePath: "/evidence/order1/recepcion_frontal.jpg",
      description: "Vista frontal del vehículo en recepción",
      customerVisible: true,
    },
  });

  await prisma.evidence.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      uploadedById: tech.id,
      category: "tablero_testigos",
      filePath: "/evidence/order1/tablero_testigos.jpg",
      description: "Tablero con testigos DPF y Check Engine activos",
      customerVisible: true,
    },
  });

  await prisma.evidence.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      uploadedById: tech.id,
      category: "escaner",
      filePath: "/evidence/order1/scan_dtc.jpg",
      description: "Captura de escáner con DTCs activos P2002 y P0401",
    },
  });

  await prisma.evidence.create({
    data: {
      serviceOrderId: order1.id,
      vehicleId: vehicle1.id,
      uploadedById: tech.id,
      category: "herramienta_conectada",
      filePath: "/evidence/order1/autotuner_conectado.jpg",
      description: "Autotuner conectado vía OBD para lectura ECU",
      marketingUsable: true,
    },
  });

  // ── Audit Logs ──
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entityType: "ServiceOrder",
      entityId: order1.id,
      action: "create",
      newValue: JSON.stringify({ folio: "OS-2026-000001" }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: tech.id,
      entityType: "ServiceOrder",
      entityId: order1.id,
      action: "status_change",
      oldValue: "borrador",
      newValue: "en_analisis",
    },
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Demo users:");
  console.log("  admin@ditrucks.com / admin123 (Admin)");
  console.log("  tecnico@ditrucks.com / tech123 (Técnico)");
  console.log("  calibrador@ditrucks.com / calib123 (Calibrador)");
  console.log("  ventas@ditrucks.com / sales123 (Comercial)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
