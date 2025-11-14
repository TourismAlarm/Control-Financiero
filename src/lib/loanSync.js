/**
 * Utilidades para sincronización entre transacciones y préstamos
 *
 * Este módulo maneja la sincronización bidireccional entre:
 * - Transacciones de pago de préstamos
 * - Registros de pagos en la tabla loans.pagos_realizados
 */

/**
 * Detecta si una transacción está relacionada con un préstamo
 * @param {Object} transaction - La transacción a verificar
 * @returns {Object|null} - Información del préstamo si está relacionada, null si no
 */
export function detectLoanTransaction(transaction) {
  if (!transaction || !transaction.description) {
    return null;
  }

  const description = transaction.description.toLowerCase();

  // Patrón para cuotas: "Cuota préstamo [Nombre] #[Número]"
  const cuotaMatch = description.match(/cuota pr[ée]stamo (.+?) #(\d+)/i);
  if (cuotaMatch) {
    return {
      type: 'cuota',
      loanName: cuotaMatch[1],
      paymentNumber: parseInt(cuotaMatch[2], 10),
    };
  }

  // Patrón para amortizaciones: "Amortización anticipada [Nombre]"
  const amortizacionMatch = description.match(/amortizaci[oó]n (?:anticipada )?(.+)/i);
  if (amortizacionMatch) {
    return {
      type: 'amortizacion',
      loanName: amortizacionMatch[1],
    };
  }

  return null;
}

/**
 * Encuentra un préstamo por nombre
 * @param {Array} loans - Lista de préstamos
 * @param {string} loanName - Nombre del préstamo a buscar
 * @returns {Object|null} - El préstamo encontrado o null
 */
export function findLoanByName(loans, loanName) {
  if (!loans || !loanName) return null;

  return loans.find(loan =>
    loan.name?.toLowerCase() === loanName.toLowerCase() ||
    loan.nombre?.toLowerCase() === loanName.toLowerCase()
  );
}

/**
 * Encuentra el índice de un pago en pagos_realizados por número de pago
 * @param {Object} loan - El préstamo
 * @param {number} paymentNumber - Número del pago
 * @returns {number} - Índice del pago o -1 si no se encuentra
 */
export function findPaymentIndexByNumber(loan, paymentNumber) {
  if (!loan || !loan.pagos_realizados || !Array.isArray(loan.pagos_realizados)) {
    return -1;
  }

  return loan.pagos_realizados.findIndex(pago =>
    pago.numero_pago === paymentNumber
  );
}

/**
 * Encuentra el índice de un pago en pagos_realizados por monto y fecha aproximada
 * @param {Object} loan - El préstamo
 * @param {number} amount - Monto del pago
 * @param {string} date - Fecha del pago
 * @param {number} daysTolerance - Tolerancia en días para la fecha (default: 3)
 * @returns {number} - Índice del pago o -1 si no se encuentra
 */
export function findPaymentIndexByAmountAndDate(loan, amount, date, daysTolerance = 3) {
  if (!loan || !loan.pagos_realizados || !Array.isArray(loan.pagos_realizados)) {
    return -1;
  }

  const targetDate = new Date(date);
  const targetAmount = parseFloat(amount);

  return loan.pagos_realizados.findIndex(pago => {
    const pagoDate = new Date(pago.fecha);
    const pagoAmount = parseFloat(pago.monto);

    // Comparar monto (con tolerancia de 0.01 para decimales)
    const amountMatches = Math.abs(pagoAmount - targetAmount) < 0.01;

    // Comparar fecha (con tolerancia de días)
    const daysDiff = Math.abs((pagoDate - targetDate) / (1000 * 60 * 60 * 24));
    const dateMatches = daysDiff <= daysTolerance;

    return amountMatches && dateMatches;
  });
}

/**
 * Genera un mensaje de advertencia para el usuario antes de eliminar una transacción de préstamo
 * @param {Object} loanInfo - Información del préstamo detectada
 * @returns {string} - Mensaje de advertencia
 */
export function getLoanDeletionWarning(loanInfo) {
  if (!loanInfo) return '';

  if (loanInfo.type === 'cuota') {
    return `⚠️ ATENCIÓN: Esta transacción está relacionada con el préstamo "${loanInfo.loanName}" (cuota #${loanInfo.paymentNumber}).\n\n¿Deseas eliminar también el registro del pago en el módulo de Deudas?`;
  }

  if (loanInfo.type === 'amortizacion') {
    return `⚠️ ATENCIÓN: Esta transacción es una amortización anticipada del préstamo "${loanInfo.loanName}".\n\nSi eliminas esta transacción, deberías revisar manualmente el módulo de Deudas.`;
  }

  return '';
}

/**
 * Valida si una transacción puede estar sincronizada con un préstamo
 * @param {Object} transaction - La transacción
 * @returns {boolean} - true si puede estar sincronizada
 */
export function canBeSyncedWithLoan(transaction) {
  if (!transaction) return false;

  // Debe ser un gasto
  if (transaction.type !== 'expense') return false;

  // Debe tener descripción
  if (!transaction.description) return false;

  // Debe contener palabras clave
  const description = transaction.description.toLowerCase();
  return description.includes('préstamo') ||
         description.includes('prestamo') ||
         description.includes('cuota') ||
         description.includes('amortización') ||
         description.includes('amortizacion');
}
