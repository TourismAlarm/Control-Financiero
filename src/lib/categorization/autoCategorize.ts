export interface CategorizationRule {
  keywords: string[];
  category: string;
  priority: number;
}

export const DEFAULT_RULES: CategorizationRule[] = [
  // Alimentación
  { keywords: ['mercadona', 'carrefour', 'lidl', 'aldi', 'día', 'supermercado', 'verdulería', 'panadería'], category: 'Alimentación', priority: 10 },
  { keywords: ['restaurante', 'bar', 'cafetería', 'mcdonalds', 'burger', 'pizza'], category: 'Restaurantes', priority: 10 },

  // Transporte
  { keywords: ['gasolina', 'gasolinera', 'repsol', 'cepsa', 'bp', 'carburante'], category: 'Transporte', priority: 10 },
  { keywords: ['taxi', 'uber', 'cabify', 'metro', 'bus', 'renfe', 'tren'], category: 'Transporte', priority: 10 },
  { keywords: ['parking', 'aparcamiento', 'estacionamiento'], category: 'Transporte', priority: 10 },

  // Vivienda
  { keywords: ['alquiler', 'renta', 'arrendamiento'], category: 'Vivienda', priority: 10 },
  { keywords: ['luz', 'electricidad', 'iberdrola', 'endesa', 'naturgy'], category: 'Vivienda', priority: 10 },
  { keywords: ['agua', 'gas'], category: 'Vivienda', priority: 9 },

  // Telecomunicaciones
  { keywords: ['movistar', 'vodafone', 'orange', 'yoigo', 'internet', 'fibra'], category: 'Telecomunicaciones', priority: 10 },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'disney+', 'hbo'], category: 'Entretenimiento', priority: 10 },

  // Salud
  { keywords: ['farmacia', 'médico', 'hospital', 'clínica', 'dentista'], category: 'Salud', priority: 10 },

  // Compras
  { keywords: ['amazon', 'ebay', 'aliexpress', 'zara', 'h&m', 'decathlon'], category: 'Compras', priority: 8 },

  // Educación
  { keywords: ['universidad', 'colegio', 'academia', 'curso', 'matrícula'], category: 'Educación', priority: 10 },

  // Ingresos
  { keywords: ['nómina', 'salario', 'sueldo', 'paga'], category: 'Nómina', priority: 10 },
  { keywords: ['transferencia recibida', 'ingreso'], category: 'Otros ingresos', priority: 5 },
];

export function autoCategorize(description: string, rules: CategorizationRule[] = DEFAULT_RULES): string | null {
  const lowerDesc = description.toLowerCase();

  // Encontrar todas las reglas que coinciden
  const matches = rules
    .filter(rule => rule.keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase())))
    .sort((a, b) => b.priority - a.priority); // Ordenar por prioridad

  return matches.length > 0 && matches[0] ? matches[0].category : null;
}

export function saveCustomRules(rules: CategorizationRule[]) {
  localStorage.setItem('customCategorizationRules', JSON.stringify(rules));
}

export function loadCustomRules(): CategorizationRule[] {
  const saved = localStorage.getItem('customCategorizationRules');
  return saved ? JSON.parse(saved) : [];
}

export function getAllRules(): CategorizationRule[] {
  return [...DEFAULT_RULES, ...loadCustomRules()];
}
