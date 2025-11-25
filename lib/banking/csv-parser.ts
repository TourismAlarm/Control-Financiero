import Papa from 'papaparse';
import { CSVTransaction } from '@/lib/types/banking';

export interface BankCSVFormat {
  name: string;
  detector: (headers: string[]) => boolean;
  parser: (row: any) => CSVTransaction | null;
}

// Formato BBVA
const bbvaFormat: BankCSVFormat = {
  name: 'BBVA',
  detector: (headers) => {
    const lower = headers.map(h => h.toLowerCase());
    return lower.includes('fecha') &&
           (lower.includes('concepto') || lower.includes('descripción')) &&
           (lower.includes('importe') || lower.includes('cantidad'));
  },
  parser: (row) => {
    try {
      const fecha = row['Fecha'] || row['FECHA'] || row['fecha'];
      const concepto = row['Concepto'] || row['Descripción'] || row['concepto'] || row['descripción'];
      const importe = row['Importe'] || row['Cantidad'] || row['importe'] || row['cantidad'];

      if (!fecha || !concepto || importe === undefined) return null;

      // Parsear fecha (DD/MM/YYYY o YYYY-MM-DD)
      let fechaISO: string;
      if (fecha.includes('/')) {
        const [day, month, year] = fecha.split('/');
        fechaISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        fechaISO = fecha;
      }

      // Parsear monto
      const montoStr = String(importe).replace(/\./g, '').replace(',', '.');
      const monto = Math.abs(parseFloat(montoStr));

      if (isNaN(monto)) return null;

      // Determinar si es ingreso (positivo) o gasto (negativo)
      const esIngreso = parseFloat(importe.toString().replace(',', '.')) > 0;

      return {
        fecha: fechaISO,
        concepto: concepto.trim(),
        monto,
        es_ingreso: esIngreso
      };
    } catch (error) {
      console.error('Error parsing BBVA row:', error);
      return null;
    }
  }
};

// Formato Revolut
const revolutFormat: BankCSVFormat = {
  name: 'Revolut',
  detector: (headers) => {
    const lower = headers.map(h => h.toLowerCase());
    return lower.includes('type') &&
           lower.includes('description') &&
           lower.includes('amount');
  },
  parser: (row) => {
    try {
      const fecha = row['Started Date'] || row['Completed Date'];
      const concepto = row['Description'];
      const amount = row['Amount'];

      if (!fecha || !concepto || amount === undefined) return null;

      // Fecha en formato YYYY-MM-DD HH:MM:SS
      const fechaISO = fecha.split(' ')[0];

      const monto = Math.abs(parseFloat(amount));
      if (isNaN(monto)) return null;

      const esIngreso = parseFloat(amount) > 0;

      return {
        fecha: fechaISO,
        concepto: concepto.trim(),
        monto,
        es_ingreso: esIngreso
      };
    } catch (error) {
      console.error('Error parsing Revolut row:', error);
      return null;
    }
  }
};

// Formato Santander
const santanderFormat: BankCSVFormat = {
  name: 'Santander',
  detector: (headers) => {
    const lower = headers.map(h => h.toLowerCase());
    return lower.includes('fecha') &&
           lower.includes('concepto') &&
           (lower.includes('cargo') || lower.includes('abono'));
  },
  parser: (row) => {
    try {
      const fecha = row['Fecha'];
      const concepto = row['Concepto'];
      const cargo = row['Cargo'] || '0';
      const abono = row['Abono'] || '0';

      if (!fecha || !concepto) return null;

      // Fecha DD/MM/YYYY
      const [day, month, year] = fecha.split('/');
      const fechaISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Parsear montos
      const cargoNum = parseFloat(cargo.replace(/\./g, '').replace(',', '.')) || 0;
      const abonoNum = parseFloat(abono.replace(/\./g, '').replace(',', '.')) || 0;

      const monto = cargoNum > 0 ? cargoNum : abonoNum;
      const esIngreso = abonoNum > 0;

      if (monto === 0) return null;

      return {
        fecha: fechaISO,
        concepto: concepto.trim(),
        monto,
        es_ingreso: esIngreso
      };
    } catch (error) {
      console.error('Error parsing Santander row:', error);
      return null;
    }
  }
};

// Formato CaixaBank
const caixabankFormat: BankCSVFormat = {
  name: 'CaixaBank',
  detector: (headers) => {
    const lower = headers.map(h => h.toLowerCase());
    return lower.includes('data') &&
           lower.includes('concepte') &&
           lower.includes('import');
  },
  parser: (row) => {
    try {
      const fecha = row['Data'];
      const concepto = row['Concepte'];
      const importe = row['Import'];

      if (!fecha || !concepto || importe === undefined) return null;

      // Fecha DD/MM/YYYY
      const [day, month, year] = fecha.split('/');
      const fechaISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const montoStr = String(importe).replace(/\./g, '').replace(',', '.');
      const monto = Math.abs(parseFloat(montoStr));

      if (isNaN(monto)) return null;

      const esIngreso = parseFloat(montoStr) > 0;

      return {
        fecha: fechaISO,
        concepto: concepto.trim(),
        monto,
        es_ingreso: esIngreso
      };
    } catch (error) {
      console.error('Error parsing CaixaBank row:', error);
      return null;
    }
  }
};

const BANK_FORMATS: BankCSVFormat[] = [
  bbvaFormat,
  revolutFormat,
  santanderFormat,
  caixabankFormat
];

export function detectBankFormat(csvText: string): BankCSVFormat | null {
  const parsed = Papa.parse(csvText, { header: true, preview: 1 });

  if (!parsed.data || parsed.data.length === 0) return null;

  const headers = Object.keys(parsed.data[0]);

  for (const format of BANK_FORMATS) {
    if (format.detector(headers)) {
      return format;
    }
  }

  return null;
}

export function parseCSV(csvText: string, format: BankCSVFormat): CSVTransaction[] {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  const transactions: CSVTransaction[] = [];

  for (const row of parsed.data) {
    const transaction = format.parser(row);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  return transactions;
}
