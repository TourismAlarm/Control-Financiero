export interface CategorizationRule {
  keywords: string[];
  category: string;
  priority: number; // Mayor = más prioritario
}

const CATEGORIZATION_RULES: CategorizationRule[] = [
  // Alimentación
  {
    keywords: ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'consum', 'eroski', 'hipercor', 'supermercado', 'restaurante', 'bar', 'cafeteria', 'mcdonalds', 'burger', 'pizza', 'kebab', 'sushi'],
    category: 'Alimentación',
    priority: 10
  },

  // Transporte
  {
    keywords: ['renfe', 'metro', 'autobús', 'taxi', 'uber', 'cabify', 'gasolina', 'gasolinera', 'repsol', 'cepsa', 'shell', 'bp', 'parking', 'aparcamiento', 'peaje'],
    category: 'Transporte',
    priority: 10
  },

  // Vivienda
  {
    keywords: ['alquiler', 'hipoteca', 'luz', 'agua', 'gas', 'electricidad', 'endesa', 'iberdrola', 'naturgy', 'comunidad', 'ibi', 'basura'],
    category: 'Vivienda',
    priority: 15
  },

  // Servicios/Suscripciones
  {
    keywords: ['netflix', 'spotify', 'amazon prime', 'hbo', 'disney', 'apple', 'google', 'microsoft', 'telefonica', 'vodafone', 'orange', 'movistar', 'internet', 'movil', 'gimnasio', 'gym'],
    category: 'Servicios',
    priority: 12
  },

  // Ocio
  {
    keywords: ['cine', 'teatro', 'concierto', 'museo', 'fiesta', 'discoteca', 'bar copas', 'videojuego', 'steam', 'playstation', 'xbox', 'nintendo'],
    category: 'Ocio',
    priority: 8
  },

  // Salud
  {
    keywords: ['farmacia', 'medico', 'doctor', 'hospital', 'clinica', 'dentista', 'optica', 'seguro salud', 'sanitas', 'adeslas'],
    category: 'Salud',
    priority: 12
  },

  // Educación
  {
    keywords: ['universidad', 'colegio', 'academia', 'curso', 'master', 'libros', 'material escolar', 'matricula'],
    category: 'Educación',
    priority: 10
  },

  // Ropa
  {
    keywords: ['zara', 'hm', 'mango', 'pull&bear', 'bershka', 'decathlon', 'nike', 'adidas', 'ropa', 'zapateria', 'calzado'],
    category: 'Ropa',
    priority: 8
  },

  // Transferencias/Bizum (no categorizar)
  {
    keywords: ['bizum', 'transferencia', 'traspaso'],
    category: 'Otros',
    priority: 20 // Alta prioridad para no categorizar mal
  }
];

export function categorizeTransaction(concepto: string): string | null {
  const conceptoLower = concepto.toLowerCase();

  let bestMatch: { category: string; priority: number } | null = null;

  for (const rule of CATEGORIZATION_RULES) {
    for (const keyword of rule.keywords) {
      if (conceptoLower.includes(keyword.toLowerCase())) {
        if (!bestMatch || rule.priority > bestMatch.priority) {
          bestMatch = { category: rule.category, priority: rule.priority };
        }
      }
    }
  }

  return bestMatch?.category || null;
}

// Función para aprender de correcciones del usuario (futuro)
export function learnFromCorrection(concepto: string, categoriaCorrecta: string) {
  // TODO: Implementar ML básico o guardar en BD para mejorar categorizaciones
  console.log(`Learning: "${concepto}" -> ${categoriaCorrecta}`);
}
