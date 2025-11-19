/**
 * Financial Month Utilities
 *
 * Handles custom financial month calculations based on user's payday.
 * For example, if a user gets paid on the 26th, their financial month
 * runs from the 26th of one month to the 25th of the next.
 *
 * Example: financial_month_start_day = 26
 * - Nov 26 - Dec 25 = "December" financial month
 * - Dec 26 - Jan 25 = "January" financial month
 */

/**
 * Get the financial month range for a given month string
 * @param monthString Format "YYYY-MM" (e.g., "2024-12")
 * @param startDay Day of month when financial month starts (1-28)
 * @returns Object with startDate and endDate as ISO strings
 */
export function getFinancialMonthRange(monthString: string, startDay: number = 1): {
  startDate: string;
  endDate: string;
  displayLabel: string;
} {
  // If startDay is 1, use standard calendar month
  if (startDay === 1) {
    const [year, month] = monthString.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      displayLabel: monthString,
    };
  }

  // Custom financial month
  const [year, month] = monthString.split('-').map(Number);

  // Financial month starts on startDay of PREVIOUS month
  // and ends on (startDay - 1) of CURRENT month
  const startDate = new Date(year, month - 2, startDay); // Previous month
  const endDate = new Date(year, month - 1, startDay - 1); // Current month

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Format display label like "Nov 26 - Dic 25"
  const startMonthName = startDate.toLocaleString('es-ES', { month: 'short' });
  const endMonthName = endDate.toLocaleString('es-ES', { month: 'short' });
  const displayLabel = `${startMonthName} ${startDay} - ${endMonthName} ${startDay - 1}`;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    displayLabel,
  };
}

/**
 * Get the current financial month string based on today's date
 * @param startDay Day of month when financial month starts (1-28)
 * @returns Month string in format "YYYY-MM"
 */
export function getCurrentFinancialMonth(startDay: number = 1): string {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  // If today is before the start day, we're still in the previous financial month
  if (currentDay < startDay) {
    // Return previous month
    if (currentMonth === 0) {
      // January -> December of previous year
      return `${currentYear - 1}-12`;
    } else {
      return `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    }
  } else {
    // We're in the current month's financial period
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  }
}

/**
 * Get list of recent financial months for dropdowns
 * @param count Number of months to return
 * @param startDay Day of month when financial month starts (1-28)
 * @returns Array of month strings in format "YYYY-MM"
 */
export function getRecentFinancialMonths(count: number = 12, startDay: number = 1): string[] {
  const months: string[] = [];
  const today = new Date();
  const currentFinancialMonth = getCurrentFinancialMonth(startDay);

  let [year, month] = currentFinancialMonth.split('-').map(Number);

  for (let i = 0; i < count; i++) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);

    // Go back one month
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }

  return months;
}

/**
 * Format a financial month for display
 * @param monthString Format "YYYY-MM"
 * @param startDay Day of month when financial month starts (1-28)
 * @returns Formatted string like "Diciembre 2024" or "Nov 26 - Dic 25, 2024"
 */
export function formatFinancialMonth(monthString: string, startDay: number = 1): string {
  const [year, month] = monthString.split('-').map(Number);

  if (startDay === 1) {
    // Standard month format
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('es-ES', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  } else {
    // Custom financial month format
    const { displayLabel } = getFinancialMonthRange(monthString, startDay);
    return `${displayLabel}, ${year}`;
  }
}

/**
 * Check if a date falls within a financial month
 * @param date Date to check (ISO string or Date object)
 * @param monthString Financial month in format "YYYY-MM"
 * @param startDay Day of month when financial month starts (1-28)
 * @returns True if date is within the financial month
 */
export function isDateInFinancialMonth(
  date: string | Date,
  monthString: string,
  startDay: number = 1
): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const { startDate, endDate } = getFinancialMonthRange(monthString, startDay);

  const start = new Date(startDate);
  const end = new Date(endDate);

  return checkDate >= start && checkDate <= end;
}
