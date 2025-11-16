/**
 * Utilidades para cálculos de préstamos y amortización
 */

/**
 * Calcula la cuota mensual de un préstamo usando la fórmula de amortización francesa
 * @param {number} principal - Monto del préstamo
 * @param {number} annualRate - Tasa de interés anual (ej: 5 para 5%)
 * @param {number} months - Número de meses del préstamo
 * @returns {number} Cuota mensual
 */
export function calculateMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) {
    return principal / months;
  }

  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                  (Math.pow(1 + monthlyRate, months) - 1);

  return payment;
}

/**
 * Genera la tabla de amortización completa
 * @param {number} principal - Monto del préstamo
 * @param {number} annualRate - Tasa de interés anual
 * @param {number} months - Número de meses
 * @param {Date} startDate - Fecha de inicio del préstamo
 * @returns {Array} Tabla de amortización con cada pago
 */
export function generateAmortizationTable(principal, annualRate, months, startDate) {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months);
  const monthlyRate = annualRate / 100 / 12;

  let balance = principal;
  const table = [];

  for (let i = 1; i <= months; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    // Calcular fecha de pago
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    table.push({
      month: i,
      date: paymentDate,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance), // Evitar balance negativo por redondeo
    });
  }

  return table;
}

/**
 * Calcula el saldo restante después de N pagos
 * @param {number} principal - Monto del préstamo
 * @param {number} annualRate - Tasa de interés anual
 * @param {number} totalMonths - Plazo total en meses
 * @param {number} paidMonths - Meses pagados
 * @returns {number} Saldo restante
 */
export function calculateRemainingBalance(principal, annualRate, totalMonths, paidMonths) {
  if (paidMonths >= totalMonths) return 0;
  if (paidMonths === 0) return principal;

  const table = generateAmortizationTable(principal, annualRate, totalMonths, new Date());
  return table[paidMonths - 1]?.balance || 0;
}

/**
 * Calcula la fecha de finalización del préstamo
 * @param {Date} startDate - Fecha de inicio
 * @param {number} months - Número de meses
 * @returns {Date} Fecha de finalización
 */
export function calculateEndDate(startDate, months) {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);
  return endDate;
}

/**
 * Calcula la fecha del próximo pago
 * @param {Date} startDate - Fecha de inicio del préstamo
 * @param {number} paidMonths - Meses ya pagados
 * @returns {Date} Fecha del próximo pago
 */
export function calculateNextPaymentDate(startDate, paidMonths) {
  const nextDate = new Date(startDate);
  nextDate.setMonth(nextDate.getMonth() + paidMonths + 1);
  return nextDate;
}

/**
 * Calcula el porcentaje de progreso del préstamo
 * @param {number} paidMonths - Meses pagados
 * @param {number} totalMonths - Meses totales
 * @returns {number} Porcentaje (0-100)
 */
export function calculateProgress(paidMonths, totalMonths) {
  if (totalMonths === 0) return 0;
  return Math.min(100, (paidMonths / totalMonths) * 100);
}

/**
 * Calcula el total de intereses pagados hasta ahora
 * @param {number} principal - Monto del préstamo
 * @param {number} annualRate - Tasa de interés anual
 * @param {number} totalMonths - Plazo total
 * @param {number} paidMonths - Meses pagados
 * @returns {number} Total de intereses pagados
 */
export function calculateTotalInterestPaid(principal, annualRate, totalMonths, paidMonths) {
  if (paidMonths === 0) return 0;

  const table = generateAmortizationTable(principal, annualRate, totalMonths, new Date());
  return table.slice(0, paidMonths).reduce((sum, row) => sum + row.interest, 0);
}

/**
 * Calcula el total de intereses a pagar durante toda la vida del préstamo
 * @param {number} principal - Monto del préstamo
 * @param {number} annualRate - Tasa de interés anual
 * @param {number} months - Número de meses
 * @returns {number} Total de intereses
 */
export function calculateTotalInterest(principal, annualRate, months) {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months);
  return (monthlyPayment * months) - principal;
}

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad
 * @returns {string} Cantidad formateada
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0,00 €';
  }

  // Formatear manualmente sin Intl
  const fixed = Number(amount).toFixed(2);
  const parts = fixed.split('.');

  // Agregar separadores de miles
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Usar coma como separador decimal
  return parts.join(',') + ' €';
}

/**
 * Formatea una fecha en formato legible
 * @param {Date} date - Fecha
 * @returns {string} Fecha formateada
 */
export function formatDate(date) {
  if (!date) return 'Sin definir';

  try {
    const d = new Date(date);

    // Verificar que la fecha es válida
    if (isNaN(d.getTime())) return 'Fecha inválida';

    // Formatear manualmente sin usar Intl
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    logger.error('Error formateando fecha:', error);
    return 'Error en fecha';
  }
}

/**
 * Calcula cuántos días faltan hasta una fecha
 * @param {Date} date - Fecha objetivo
 * @returns {number} Días restantes
 */
export function daysUntil(date) {
  const today = new Date();
  const target = new Date(date);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
