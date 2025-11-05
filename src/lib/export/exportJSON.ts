import { format } from 'date-fns';

export function exportToJSON(data: any, fileName?: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `backup_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export function exportFullBackup(transactions: any[], accounts: any[], categories: any[]) {
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      transactions,
      accounts,
      categories
    }
  };

  exportToJSON(backup, `backup_completo_${format(new Date(), 'yyyy-MM-dd')}.json`);
}
