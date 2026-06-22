"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui";

export interface QuoterApplicationOption {
  id: string;
  category: string;
  brand: string;
  model: string;
}

interface QuoterApplicationPickerProps {
  applications: QuoterApplicationOption[];
  value: string;
  onChange: (id: string) => void;
}

export function QuoterApplicationPicker({ applications, value, onChange }: QuoterApplicationPickerProps) {
  const selected = applications.find((a) => a.id === value);
  const [category, setCategory] = useState(selected?.category || "");
  const [brand, setBrand] = useState(selected?.brand || "");

  useEffect(() => {
    if (selected) {
      setCategory(selected.category);
      setBrand(selected.brand);
    }
  }, [selected?.id]);

  const categories = useMemo(
    () => [...new Set(applications.map((a) => a.category))].sort(),
    [applications]
  );
  const brands = useMemo(
    () => [...new Set(applications.filter((a) => a.category === category).map((a) => a.brand))].sort(),
    [applications, category]
  );
  const models = useMemo(
    () =>
      applications
        .filter((a) => a.category === category && a.brand === brand)
        .sort((a, b) => a.model.localeCompare(b.model)),
    [applications, category, brand]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Select
        label="Categoría"
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          setBrand("");
          onChange("");
        }}
        options={categories.map((c) => ({ value: c, label: c }))}
        placeholder="Selecciona categoría"
      />
      <Select
        label="Marca"
        value={brand}
        onChange={(e) => {
          setBrand(e.target.value);
          onChange("");
        }}
        options={brands.map((b) => ({ value: b, label: b }))}
        placeholder="Selecciona marca"
        disabled={!category}
      />
      <Select
        label="Modelo / Aplicación"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={models.map((m) => ({ value: m.id, label: m.model }))}
        placeholder="Selecciona aplicación"
        disabled={!brand}
      />
    </div>
  );
}
