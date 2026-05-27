import { prisma } from "@/lib/prisma";

export async function generateFolio(): Promise<string> {
  const currentYear = new Date().getFullYear();

  const counter = await prisma.folioCounter.upsert({
    where: { id: "folio_counter" },
    update: {
      counter: { increment: 1 },
      year: currentYear,
    },
    create: {
      id: "folio_counter",
      year: currentYear,
      counter: 1,
    },
  });

  // Reset counter if year changed
  if (counter.year !== currentYear) {
    const updated = await prisma.folioCounter.update({
      where: { id: "folio_counter" },
      data: { year: currentYear, counter: 1 },
    });
    return `OS-${currentYear}-${String(updated.counter).padStart(6, "0")}`;
  }

  return `OS-${counter.year}-${String(counter.counter).padStart(6, "0")}`;
}
