export interface CategorizationRule {
  keywords: string[];
  category: string;
  priority: number;
}

export const DEFAULT_RULES: CategorizationRule[] = [

  // ─── ALIMENTACIÓ / ALIMENTACIÓN ───────────────────────────────────────────

  // Supermercats / cadenes alimentació
  {
    keywords: [
      // Cadenas España/Catalunya
      'mercadona', 'carrefour', 'lidl', 'aldi', 'dia ', 'dia,', 'supercor',
      'eroski', 'consum', 'simply', 'alcampo', 'hipercor', 'el corte ingles',
      // Cadenes catalanes grans
      'bonpreu', 'esclat', 'caprabo', 'condis', 'plusfresc', 'valvi',
      'sorli', 'spar', 'coviran', 'suma ', 'supermercados',
      // Cadenes especialitzades catalanes (noms propis)
      'atmetller', 'casa atmetller', 'veritas', 'la sirena', 'bon preu',
      'el corte catalan', 'supeco', 'froiz', 'econom', 'udl ',
      'turbiat', 'can biosca', 'formatgeria jaume',
      // Genèric
      'supermercat', 'supermercado', 'hiper',
    ],
    category: 'Alimentación',
    priority: 10,
  },

  // Forns, pastisseries i comerços de proximitat
  {
    keywords: [
      // "forn" sol ja cobreix: forn bellver, forn X, forn de pa...
      'forn ', 'pastisseria', 'fleca', 'carnisseria',
      'cansaladeria', 'fruiteria', 'verdureria', 'peixateria', 'xarcuteria',
      'colmado', 'queviures', 'formatgeria', 'herbolari', 'mercat municipal',
      'mercat de', 'la boqueria', 'confiteria', 'dolceria',
      // Noms propis de forns/pastisseries conegudes
      'baluard', 'turris', 'hofmann', 'escriba', 'escribà',
      'foix de sarria', 'foix de sarrià', 'mauri', 'oriol balaguer',
      // Castellano
      'panadería', 'pastelería', 'carnicería', 'pescadería', 'frutería',
      'verdulería', 'charcutería', 'ultramarinos', 'herbolario', 'mercado',
      // Genèric
      'alimentacion', 'alimentació', 'frutas', 'verduras',
    ],
    category: 'Alimentación',
    priority: 11,
  },

  // ─── RESTAURANTS / RESTAURANTES ───────────────────────────────────────────

  // Fast food & cadenes
  {
    keywords: [
      'mcdonalds', 'mc donald', 'mcdonald', 'burger king', 'kfc',
      'telepizza', 'pizza hut', 'dominos', 'domino\'s', 'papa john',
      'subway', 'pans&company', 'pans company', 'hundred montaditos',
      'foster holly', 'five guys', 'goiko', 'nostrum',
    ],
    category: 'Restaurantes',
    priority: 12,
  },

  // Restaurants generals
  {
    keywords: [
      // Catalan
      'restaurant', 'cerveseria', 'bodega', 'taberna', 'taverna',
      'taperia', 'tapes', 'xurreria', 'granja', 'bar restaurant',
      'menú del dia', 'menú dia', 'menu dia',
      // Castellano
      'restaurante', 'bar', 'cafetería', 'mesón', 'tasca', 'chiringuito',
      'hamburguesería', 'pizzería', 'bocatería', 'churrería', 'taberna',
      // Tipus cuina
      'kebab', 'sushi', 'wok', 'japonés', 'chino', 'asiatico',
      'indio', 'tailandés', 'mexicano', 'thai', 'ramen', 'poke',
      // Genèric
      'comida', 'menjar',
    ],
    category: 'Restaurantes',
    priority: 10,
  },

  // Cafès i bars
  {
    keywords: [
      'cafè', 'cafe ', 'café', 'cafeteria', 'cafetería', 'starbucks',
      'costa coffee', 'mccafé', 'latte', 'bakery',
    ],
    category: 'Restaurantes',
    priority: 9,
  },

  // ─── TRANSPORT ────────────────────────────────────────────────────────────

  // Combustible
  {
    keywords: [
      'gasolina', 'gasolinera', 'repsol', 'cepsa', 'bp', 'shell',
      'galp', 'petronor', 'carburante', 'combustible', 'diesel',
      'benzina', 'estació de servei', 'estacion de servicio',
    ],
    category: 'Transporte',
    priority: 10,
  },

  // Transport públic
  {
    keywords: [
      // Operadores catalanes / españoles
      'metro', 'fgc', 'rodalies', 'tram', 'tramvia', 'tmb', 'aerobus',
      'bicing', 'renfe', 'ave', 'alvia', 'cercanías', 'rodalies',
      // VTC / Taxi
      'taxi', 'uber', 'cabify', 'bolt', 'blablacar',
      // Bus
      'bus ', 'autobus', 'autobús', 'autocar', 'alsa', 'flixbus',
      // Patinets / bici
      'lime', 'tier', 'voi', 'patinete', 'patinet', 'scooter',
    ],
    category: 'Transporte',
    priority: 10,
  },

  // Vols
  {
    keywords: [
      'vueling', 'ryanair', 'iberia', 'volotea', 'easyjet', 'level',
      'aeropuerto', 'aeroport', 'aena', 'boarding', 'airline', 'air ',
    ],
    category: 'Transporte',
    priority: 10,
  },

  // Parking / peatge
  {
    keywords: [
      'parking', 'aparcament', 'aparcamiento', 'estacionament', 'estacionamiento',
      'peatge', 'peaje', 'via t', 'autopista', 'autovia', 'telepeaje',
    ],
    category: 'Transporte',
    priority: 10,
  },

  // Cotxe / manteniment
  {
    keywords: [
      'taller', 'mecànic', 'mecanico', 'itv', 'pneumàtics', 'neumaticos',
      'michelin', 'continental', 'autoescuela', 'autoescola',
    ],
    category: 'Transporte',
    priority: 9,
  },

  // ─── HABITATGE / VIVIENDA ─────────────────────────────────────────────────

  // Lloguer / Hipoteca
  {
    keywords: [
      'alquiler', 'lloguer', 'renta mensual', 'arrendamiento', 'arrendament',
      'hipoteca', 'préstamo hipotecario', 'prestec hipotecari',
      'comunitat de propietaris', 'comunidad de propietarios',
      'ibi', 'contribució', 'derama', 'derrama',
    ],
    category: 'Vivienda',
    priority: 12,
  },

  // Electricitat
  {
    keywords: [
      'iberdrola', 'endesa', 'naturgy', 'holaluz', 'octopus energy',
      'enel', 'repsol luz', 'electricitat', 'electricidad', 'llum',
      'factura electric', 'factura llum',
    ],
    category: 'Vivienda',
    priority: 10,
  },

  // Aigua / Gas
  {
    keywords: [
      'agbar', 'aigues de barcelona', 'aigues ter', 'sorea', 'acsa',
      'canal isabel', 'global omnium', 'factura agua', 'factura aigua',
      'gas natural', 'naturgas', 'gas y calor', 'factura gas',
    ],
    category: 'Vivienda',
    priority: 10,
  },

  // Bricolatge / Llar
  {
    keywords: [
      'leroy merlin', 'bricomart', 'bauhaus', 'aki ', 'ikea',
      'el corte ingles hogar', 'ferreteria', 'ferretería',
      'bricolage', 'material construccio', 'fontaneria', 'fontanería',
    ],
    category: 'Vivienda',
    priority: 9,
  },

  // ─── TELECOMUNICACIONES ───────────────────────────────────────────────────

  {
    keywords: [
      'movistar', 'vodafone', 'orange', 'yoigo', 'jazztel', 'masmovil',
      'pepephone', 'lowi', 'simyo', 'digi', 'amena', 'hits mobile',
      'internet', 'fibra', 'wifi', 'adsl', 'roaming',
      'telefonica', 'telefònica', 'telecomunicacion', 'telecomunicació',
    ],
    category: 'Telecomunicaciones',
    priority: 10,
  },

  // ─── SUBSCRIPCIONS / ENTRETENIMIENTO ──────────────────────────────────────

  // Streaming vídeo/música
  {
    keywords: [
      'netflix', 'spotify', 'amazon prime', 'disney+', 'disney plus',
      'hbo', 'max ', 'apple tv', 'youtube premium', 'twitch',
      'filmin', 'mubi', 'rakuten tv', 'audible', 'deezer', 'tidal',
      'primevideo', 'prime video',
    ],
    category: 'Entretenimiento',
    priority: 10,
  },

  // Gaming
  {
    keywords: [
      'playstation', 'xbox', 'nintendo', 'steam', 'epic games',
      'ea games', 'ubisoft', 'game pass', 'psn', 'ps store', 'ps4', 'ps5',
    ],
    category: 'Entretenimiento',
    priority: 10,
  },

  // Oci presencial
  {
    keywords: [
      'cinema', 'cine', 'cinesa', 'yelmo', 'kinepolis', 'cines',
      'teatre', 'teatro', 'concert', 'concierto', 'festival',
      'sala de concerts', 'ticketmaster', 'entradas', 'entrades',
      'museu', 'museo', 'zoo', 'aquarium', 'aquàrium', 'parc temàtic',
      'parque de atracciones', 'port aventura', 'portaventura',
    ],
    category: 'Entretenimiento',
    priority: 10,
  },

  // ─── SALUT / SALUD ────────────────────────────────────────────────────────

  {
    keywords: [
      // Farmàcia
      'farmacia', 'farmàcia', 'parafarmacia', 'parafarma', 'farmacenter',
      // Metges / hospitals
      'médico', 'metge', 'metgessa', 'hospital', 'clínica', 'clinica',
      'centre medic', 'centro medico', 'ambulatori', 'cap ', 'caf ',
      // Especialistes
      'dentista', 'dentisteria', 'ortodòncia', 'ortodoncia', 'implant dental',
      'óptica', 'optica', 'optometria', 'optometrista', 'ulleres', 'gafas',
      'psicólogo', 'psicòleg', 'psicoleg', 'terapeuta', 'terapia',
      'fisioterapeuta', 'fisioterapia', 'osteopatia', 'osteópata',
      'ginecóloga', 'ginecologia', 'traumatologia', 'cardiologia',
      // Assegurances salut
      'adeslas', 'sanitas', 'asisa', 'dkv', 'mapfre salud', 'mútua',
      'mutua', 'mutualitat', 'quironsalud', 'teknon', 'corachan',
    ],
    category: 'Salud',
    priority: 10,
  },

  // ─── ESPORT / DEPORTE ─────────────────────────────────────────────────────

  {
    keywords: [
      'gimnàs', 'gimnasio', 'gym', 'fitness', 'dir ', 'diresport',
      'holmes place', 'anytime fitness', 'mcfit', 'basic fit', 'basicfit',
      'piscina', 'natació', 'natacion', 'yoga', 'pilates', 'crossfit',
      'esport', 'deporte', 'padel', 'tenis', 'tennis', 'squash',
      'club esportiu', 'club deportivo', 'federació', 'federacion',
    ],
    category: 'Salud',
    priority: 9,
  },

  // ─── COMPRAS / COMPRES ────────────────────────────────────────────────────

  // Online
  {
    keywords: [
      'amazon', 'aliexpress', 'ebay', 'wallapop', 'vinted', 'shein',
      'temu', 'wish', 'zalando', 'asos', 'pccomponentes', 'worten',
      'fnac', 'mediamarkt', 'media markt', 'el corte ingles',
    ],
    category: 'Compras',
    priority: 8,
  },

  // Roba / Moda
  {
    keywords: [
      'zara', 'pull&bear', 'pull bear', 'bershka', 'stradivarius',
      'massimo dutti', 'mango', 'h&m', 'primark', 'c&a',
      'lefties', 'oysho', 'uniqlo', 'nike', 'adidas', 'puma',
      'new balance', 'converse', 'vans', 'footlocker', 'sprinter',
      'decathlon', 'jack&jones', 'springfield', 'women secret',
    ],
    category: 'Compras',
    priority: 8,
  },

  // ─── EDUCACIÓ / EDUCACIÓN ─────────────────────────────────────────────────

  {
    keywords: [
      // Centres educatius
      'universitat', 'universidad', 'upc', 'uab', 'ub ', 'upf',
      'url ', 'esade', 'iese', 'eae', 'col·legi', 'colegio',
      'escola', 'escuela', 'institut', 'instituto', 'llar d\'infants',
      'guarderia', 'jardí d\'infants',
      // Formació
      'acadèmia', 'academia', 'curso', 'curs', 'màster', 'master',
      'formació', 'formación', 'matrícula', 'matricula', 'examen',
      // Material
      'papeleria', 'papereria', 'fnac libros', 'casa del libro',
      'libros', 'llibres', 'llibreria', 'librería',
    ],
    category: 'Educación',
    priority: 10,
  },

  // ─── FINANCES / FINANZAS ──────────────────────────────────────────────────

  // Assegurances
  {
    keywords: [
      'assegurança', 'seguro', 'mutua', 'mútua', 'axa', 'mapfre',
      'allianz', 'catalana occident', 'zurich', 'generali', 'arag',
      'pelayo', 'linea directa', 'línea directa',
    ],
    category: 'Seguros',
    priority: 10,
  },

  // Comissions bancàries
  {
    keywords: [
      'comisión', 'comissió', 'mantenimiento cuenta', 'manteniment compte',
      'quota manteniment', 'tarifa', 'comision administracion',
      'interessos', 'intereses', 'mora', 'penalización',
    ],
    category: 'Comisiones bancarias',
    priority: 11,
  },

  // ─── NÒMINA / INGRESOS ────────────────────────────────────────────────────

  {
    keywords: [
      'nòmina', 'nomina', 'nómina', 'salari', 'salario', 'sou', 'sueldo',
      'paga', 'haberes', 'remuneracion', 'remuneració',
    ],
    category: 'Nómina',
    priority: 10,
  },

  {
    keywords: [
      'transferència rebuda', 'transferencia recibida',
      'ingres', 'ingreso', 'abonament', 'abono',
    ],
    category: 'Otros ingresos',
    priority: 5,
  },

  // ─── MASCOTES / MASCOTAS ──────────────────────────────────────────────────

  {
    keywords: [
      'veterinari', 'veterinario', 'clínica veterinaria', 'clinica veterinaria',
      'kiwoko', 'miscota', 'tienda animales', 'botiga animals',
      'pienso', 'pinso', 'mascota', 'mascotes',
    ],
    category: 'Mascotas',
    priority: 10,
  },

  // ─── VIAJES / VIATGES ─────────────────────────────────────────────────────

  {
    keywords: [
      'hotel', 'hostal', 'albergue', 'alberg', 'airbnb', 'booking',
      'trivago', 'expedia', 'logitravel', 'lastminute', 'viaje', 'viatge',
      'agencia de viajes', 'agència de viatges',
    ],
    category: 'Viajes',
    priority: 9,
  },

];

export function autoCategorize(description: string, rules: CategorizationRule[] = DEFAULT_RULES): string | null {
  const lowerDesc = description.toLowerCase();

  // Trobem totes les regles que encaixen i ordenem per prioritat
  const matches = rules
    .filter(rule => rule.keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase())))
    .sort((a, b) => b.priority - a.priority);

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
