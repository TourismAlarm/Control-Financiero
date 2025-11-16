/**
 * Utilidades para exportar datos a diferentes formatos
 */

/**
 * Exportar historial de pagos a CSV
 * @param {Object} loan - El préstamo con sus pagos
 * @returns {void}
 */
export function exportPaymentsToCSV(loan) {
  if (!loan || !loan.pagos_realizados || loan.pagos_realizados.length === 0) {
    alert('No hay pagos para exportar');
    return;
  }

  const headers = ['Número', 'Fecha', 'Monto', 'Tipo'];
  const rows = loan.pagos_realizados.map((pago, index) => [
    pago.numero_pago || index + 1,
    formatDateForExport(pago.fecha),
    pago.monto.toFixed(2),
    pago.tipo || 'cuota'
  ]);

  // Agregar resumen
  const totalPagado = loan.pagos_realizados.reduce((sum, p) => sum + parseFloat(p.monto), 0);
  rows.push([]);
  rows.push(['RESUMEN']);
  rows.push(['Total Pagado', '', totalPagado.toFixed(2), '']);
  rows.push(['Número de Pagos', loan.pagos_realizados.length, '', '']);

  // Convertir a CSV
  const csvContent = [
    `Historial de Pagos - ${loan.nombre || loan.name}`,
    `Generado: ${new Date().toLocaleDateString('es-ES')}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Descargar archivo
  downloadFile(csvContent, `historial_pagos_${sanitizeFileName(loan.nombre || loan.name)}.csv`, 'text/csv');
}

/**
 * Exportar tabla de amortización completa a CSV
 * @param {Object} loan - El préstamo
 * @param {Array} amortizationTable - Tabla de amortización
 * @returns {void}
 */
export function exportAmortizationToCSV(loan, amortizationTable) {
  if (!amortizationTable || amortizationTable.length === 0) {
    alert('No hay tabla de amortización para exportar');
    return;
  }

  const headers = ['Mes', 'Fecha Pago', 'Cuota', 'Interés', 'Principal', 'Saldo Pendiente', 'Estado'];
  const rows = amortizationTable.map(row => [
    row.month,
    formatDateForExport(row.date),
    row.payment.toFixed(2),
    row.interest.toFixed(2),
    row.principal.toFixed(2),
    row.balance.toFixed(2),
    row.isPaid ? 'Pagado' : 'Pendiente'
  ]);

  // Agregar resumen
  const totalInterest = amortizationTable.reduce((sum, r) => sum + r.interest, 0);
  const totalPrincipal = amortizationTable.reduce((sum, r) => sum + r.principal, 0);
  const totalPayments = amortizationTable.reduce((sum, r) => sum + r.payment, 0);

  rows.push([]);
  rows.push(['RESUMEN']);
  rows.push(['Total Intereses', '', '', totalInterest.toFixed(2), '', '', '']);
  rows.push(['Total Principal', '', '', '', totalPrincipal.toFixed(2), '', '']);
  rows.push(['Total Pagos', '', totalPayments.toFixed(2), '', '', '', '']);

  // Convertir a CSV
  const csvContent = [
    `Tabla de Amortización - ${loan.nombre || loan.name}`,
    `Monto Total: ${loan.monto_total || loan.principal_amount}`,
    `Tasa de Interés: ${loan.tasa_interes || loan.interest_rate}%`,
    `Plazo: ${loan.plazo_meses} meses`,
    `Generado: ${new Date().toLocaleDateString('es-ES')}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Descargar archivo
  downloadFile(
    csvContent,
    `tabla_amortizacion_${sanitizeFileName(loan.nombre || loan.name)}.csv`,
    'text/csv'
  );
}

/**
 * Exportar historial de pagos a PDF (usando HTML2Canvas + jsPDF)
 * @param {Object} loan - El préstamo con sus pagos
 * @returns {void}
 */
export async function exportPaymentsToPDF(loan) {
  if (!loan || !loan.pagos_realizados || loan.pagos_realizados.length === 0) {
    alert('No hay pagos para exportar');
    return;
  }

  // Crear contenido HTML para el PDF
  const htmlContent = generatePaymentsHTML(loan);

  // Crear elemento temporal
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = 'white';
  document.body.appendChild(tempDiv);

  try {
    // Importar dinámicamente las librerías
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    // Convertir a canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    // Crear PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    // Agregar primera página
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Agregar páginas adicionales si es necesario
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Descargar PDF
    pdf.save(`historial_pagos_${sanitizeFileName(loan.nombre || loan.name)}.pdf`);
  } catch (error) {
    logger.error('Error generando PDF:', error);
    alert('Error al generar PDF. Intenta exportar a CSV en su lugar.');
  } finally {
    // Limpiar elemento temporal
    document.body.removeChild(tempDiv);
  }
}

/**
 * Generar HTML para el reporte de pagos
 * @param {Object} loan - El préstamo
 * @returns {string} - HTML del reporte
 */
function generatePaymentsHTML(loan) {
  const totalPagado = loan.pagos_realizados.reduce((sum, p) => sum + parseFloat(p.monto), 0);
  const totalIntereses = loan.pagos_realizados.reduce((sum, p) => {
    // Si el pago tiene desglose de interés, usarlo
    if (p.interes) return sum + parseFloat(p.interes);
    return sum;
  }, 0);

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin-bottom: 10px;">Historial de Pagos</h1>
        <h2 style="color: #374151; font-weight: normal;">${loan.nombre || loan.name}</h2>
        <p style="color: #6b7280; font-size: 14px;">Generado: ${new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
      </div>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin-top: 0; color: #374151;">Información del Préstamo</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Monto Original:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">€${(loan.monto_total || loan.principal_amount || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Tasa de Interés:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${(loan.tasa_interes || loan.interest_rate || 0).toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Plazo:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${loan.plazo_meses || 0} meses</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Cuota Mensual:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">€${(loan.cuota_mensual || loan.monthly_payment || 0).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <h3 style="color: #374151; margin-bottom: 15px;">Pagos Realizados (${loan.pagos_realizados.length})</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #e5e7eb;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">#</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Fecha</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Monto</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d1d5db;">Tipo</th>
          </tr>
        </thead>
        <tbody>
          ${loan.pagos_realizados.map((pago, index) => `
            <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${pago.numero_pago || index + 1}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDateForExport(pago.fecha)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">€${parseFloat(pago.monto).toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                <span style="background-color: ${pago.tipo === 'amortizacion' ? '#fef3c7' : '#dbeafe'};
                             color: ${pago.tipo === 'amortizacion' ? '#92400e' : '#1e40af'};
                             padding: 4px 8px;
                             border-radius: 4px;
                             font-size: 12px;">
                  ${pago.tipo || 'Cuota'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #374151;">Resumen</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Total Pagado:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #059669; font-size: 18px;">€${totalPagado.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Número de Pagos:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${loan.pagos_realizados.length}</td>
          </tr>
          ${totalIntereses > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Total Intereses:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">€${totalIntereses.toFixed(2)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Generado automáticamente por Control Financiero</p>
      </div>
    </div>
  `;
}

/**
 * Formatear fecha para exportación
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
function formatDateForExport(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Sanitizar nombre de archivo
 * @param {string} fileName - Nombre original
 * @returns {string} - Nombre sanitizado
 */
function sanitizeFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

/**
 * Descargar archivo
 * @param {string} content - Contenido del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME
 */
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
