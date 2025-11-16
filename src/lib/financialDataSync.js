// Utilidades para sincronizar datos financieros con Supabase

export async function loadFinancialData(mesActual) {
  try {
    const mes = encodeURIComponent(mesActual);
    const response = await fetch('/api/financial-data?mes=' + mes);
    
    if (!response.ok) {
      throw new Error('Error cargando datos');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error en loadFinancialData:', error);
    return null;
  }
}

export async function saveFinancialData(data) {
  try {
    const response = await fetch('/api/financial-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error guardando datos');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    logger.error('Error en saveFinancialData:', error);
    return null;
  }
}
