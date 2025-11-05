import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: {
    name: string;
    type: string;
  };
  account?: {
    name: string;
  };
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  name: string;
  total: number;
  count: number;
}

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  accounts: Account[],
  month?: string
) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Control Financiero';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();

  // Hoja 1: Transacciones
  const transSheet = workbook.addWorksheet('Transacciones');

  // Configurar columnas
  transSheet.columns = [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Cuenta', key: 'account', width: 20 },
    { header: 'Tipo', key: 'type', width: 10 },
    { header: 'Importe', key: 'amount', width: 15 }
  ];

  // Estilo de encabezado
  transSheet.getRow(1).font = { bold: true, size: 12 };
  transSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  transSheet.getRow(1).font = { ...transSheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
  transSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Añadir datos
  transactions.forEach(transaction => {
    const row = transSheet.addRow({
      date: transaction.date,
      description: transaction.description,
      category: transaction.category?.name || 'Sin categoría',
      account: transaction.account?.name || 'Sin cuenta',
      type: transaction.type === 'income' ? 'Ingreso' : 'Gasto',
      amount: transaction.amount
    });

    // Formatear importe
    const amountCell = row.getCell('amount');
    amountCell.numFmt = '#,##0.00 €';

    // Color según tipo
    if (transaction.type === 'income') {
      amountCell.font = { color: { argb: 'FF00B050' }, bold: true };
    } else {
      amountCell.font = { color: { argb: 'FFFF0000' }, bold: true };
    }
  });

  // Añadir totales
  const totalRow = transSheet.addRow(['', '', '', '', 'TOTAL:', { formula: `SUM(F2:F${transactions.length + 1})` }]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell(6).numFmt = '#,##0.00 €';
  totalRow.getCell(6).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' }
  };

  // Hoja 2: Resumen por categorías
  const catSheet = workbook.addWorksheet('Por Categorías');

  catSheet.columns = [
    { header: 'Categoría', key: 'category', width: 30 },
    { header: 'Transacciones', key: 'count', width: 15 },
    { header: 'Total', key: 'total', width: 20 }
  ];

  // Estilo de encabezado
  catSheet.getRow(1).font = { bold: true, size: 12 };
  catSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };
  catSheet.getRow(1).font = { ...catSheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
  catSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Agrupar por categorías
  const categoryTotals = transactions.reduce((acc, transaction) => {
    const catName = transaction.category?.name || 'Sin categoría';
    if (!acc[catName]) {
      acc[catName] = { total: 0, count: 0 };
    }
    acc[catName].total += transaction.amount;
    acc[catName].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  // Añadir datos de categorías
  Object.entries(categoryTotals)
    .sort(([, a], [, b]) => Math.abs(b.total) - Math.abs(a.total))
    .forEach(([category, data]) => {
      const row = catSheet.addRow({
        category,
        count: data.count,
        total: data.total
      });

      row.getCell('total').numFmt = '#,##0.00 €';

      if (data.total >= 0) {
        row.getCell('total').font = { color: { argb: 'FF00B050' }, bold: true };
      } else {
        row.getCell('total').font = { color: { argb: 'FFFF0000' }, bold: true };
      }
    });

  // Hoja 3: Resumen por cuentas
  const accSheet = workbook.addWorksheet('Por Cuentas');

  accSheet.columns = [
    { header: 'Cuenta', key: 'account', width: 30 },
    { header: 'Tipo', key: 'type', width: 20 },
    { header: 'Saldo', key: 'balance', width: 20 }
  ];

  // Estilo de encabezado
  accSheet.getRow(1).font = { bold: true, size: 12 };
  accSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };
  accSheet.getRow(1).font = { ...accSheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
  accSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Añadir cuentas
  accounts.forEach(account => {
    const row = accSheet.addRow({
      account: account.name,
      type: account.type,
      balance: account.balance
    });

    row.getCell('balance').numFmt = '#,##0.00 €';

    if (account.balance >= 0) {
      row.getCell('balance').font = { color: { argb: 'FF00B050' }, bold: true };
    } else {
      row.getCell('balance').font = { color: { argb: 'FFFF0000' }, bold: true };
    }
  });

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Crear blob y descargar
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const fileName = month
    ? `transacciones_${month}.xlsx`
    : `transacciones_${format(new Date(), 'yyyy-MM-dd', { locale: es })}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export async function exportAccountsToExcel(accounts: Account[]) {
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('Cuentas');

  sheet.columns = [
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Tipo', key: 'type', width: 20 },
    { header: 'Saldo', key: 'balance', width: 20 }
  ];

  // Estilo de encabezado
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  sheet.getRow(1).font = { ...sheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

  accounts.forEach(account => {
    const row = sheet.addRow({
      name: account.name,
      type: account.type,
      balance: account.balance
    });

    row.getCell('balance').numFmt = '#,##0.00 €';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cuentas_${format(new Date(), 'yyyy-MM-dd', { locale: es })}.xlsx`;
  link.click();

  URL.revokeObjectURL(url);
}
