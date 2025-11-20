import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: { name: string };
}

export async function exportMonthlyReportToPDF(
  transactions: Transaction[],
  month: string,
  userName: string
) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Informe Financiero Mensual', 105, 20, { align: 'center' });

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${month}`, 105, 30, { align: 'center' });
  doc.text(`Usuario: ${userName}`, 105, 36, { align: 'center' });

  // Resumen
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const balance = totalIncome - totalExpense;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen', 14, 50);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 176, 80); // Verde
  doc.text(`Ingresos: ${totalIncome.toFixed(2)} €`, 14, 58);

  doc.setTextColor(255, 0, 0); // Rojo
  doc.text(`Gastos: ${totalExpense.toFixed(2)} €`, 14, 65);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Balance: ${balance.toFixed(2)} €`, 14, 72);

  // Tabla de transacciones
  const tableData = transactions.map(t => [
    t.date,
    t.description.substring(0, 40),
    t.category?.name || 'Sin categoría',
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    `${t.amount.toFixed(2)} €`
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [68, 114, 196], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const amount = parseFloat(data.cell.raw?.toString().replace(' €', '') || '0');
        if (amount >= 0) {
          data.cell.styles.textColor = [0, 176, 80];
        } else {
          data.cell.styles.textColor = [255, 0, 0];
        }
      }
    }
  });

  // Pie de página
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount} - Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Descargar
  doc.save(`informe_${month}.pdf`);
}
