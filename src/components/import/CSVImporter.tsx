'use client';

import { useGlobalToast } from '@/components/Toaster';
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, Download, Check, X, AlertCircle, Save, Tag } from 'lucide-react';
import { autoCategorize, getAllRules } from '@/lib/categorization/autoCategorize';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
  account?: string;
  external_id?: string;
}

interface BankTemplate {
  id: string;
  name: string;
  mapping: ColumnMapping;
}

interface UserCategory {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  color?: string | null;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  account?: string;
  external_id?: string;
  isDuplicate?: boolean;
  rawRow: CSVRow;
  category_id: string | null;
  suggestedCategory: string | null;
}

const COMMON_TEMPLATES: BankTemplate[] = [
  {
    id: 'caixabank',
    name: 'CaixaBank',
    mapping: {
      date: 'Fecha',
      description: 'Concepto',
      amount: 'Importe',
      external_id: 'Referencia'
    }
  },
  {
    id: 'santander',
    name: 'Santander',
    mapping: {
      date: 'FECHA',
      description: 'CONCEPTO',
      amount: 'IMPORTE',
      external_id: 'NUM. OPERACION'
    }
  },
  {
    id: 'bbva',
    name: 'BBVA',
    mapping: {
      date: 'F.VALOR',
      description: 'CONCEPTO',
      amount: 'IMPORTE',
      external_id: 'REFERENCIA'
    }
  }
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuidOrNull = (val: string) => (val && UUID_REGEX.test(val) ? val : null);

export function CSVImporter() {
  const { toast } = useGlobalToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<BankTemplate[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [_importStats, setImportStats] = useState({ total: 0, imported: 0, duplicates: 0, errors: 0 });
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[];
        setCSVData(data);
        setHeaders(Object.keys(data[0] || {}));
        setStep('mapping');
        autoDetectColumns(Object.keys(data[0] || {}));
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast('Error al leer el archivo CSV', 'error');
      }
    });
  };

  const autoDetectColumns = (cols: string[]) => {
    const detected: ColumnMapping = {};

    cols.forEach(col => {
      const lower = col.toLowerCase();

      if (lower.includes('fecha') || lower.includes('date') || lower.includes('f.valor')) {
        detected.date = col;
      } else if (lower.includes('concepto') || lower.includes('descripcion') || lower.includes('description')) {
        detected.description = col;
      } else if (lower.includes('importe') || lower.includes('amount') || lower.includes('cantidad')) {
        detected.amount = col;
      } else if (lower.includes('referencia') || lower.includes('reference') || lower.includes('num') || lower.includes('id')) {
        detected.external_id = col;
      } else if (lower.includes('categoria') || lower.includes('category')) {
        detected.category = col;
      } else if (lower.includes('cuenta') || lower.includes('account')) {
        detected.account = col;
      }
    });

    setMapping(detected);
  };

  const applyTemplate = (templateId: string) => {
    const template = [...COMMON_TEMPLATES, ...savedTemplates].find(t => t.id === templateId);
    if (template) {
      setMapping(template.mapping);
      setSelectedTemplate(templateId);
    }
  };

  const saveCustomTemplate = () => {
    if (!customTemplateName.trim()) {
      toast('Por favor ingresa un nombre para la plantilla', 'warning');
      return;
    }

    const newTemplate: BankTemplate = {
      id: `custom_${Date.now()}`,
      name: customTemplateName,
      mapping: { ...mapping }
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem('csvTemplates', JSON.stringify(updated));
    setCustomTemplateName('');
    toast('Plantilla guardada correctamente', 'success');
  };

  const parseAmount = (value: string): number => {
    let cleaned = value.replace(/[€$£\s]/g, '');

    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }

    return parseFloat(cleaned) || 0;
  };

  const parseDate = (value: string): string => {
    if (!value) return new Date().toISOString().substring(0, 10);

    // dd/mm/yyyy or d/m/yyyy
    const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      return `${dmy[3]}-${month}-${day}`;
    }

    // yyyy-mm-dd or yyyy/mm/dd
    const ymd = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) {
      const month = ymd[2].padStart(2, '0');
      const day = ymd[3].padStart(2, '0');
      return `${ymd[1]}-${month}-${day}`;
    }

    // Try native Date parsing as last resort
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }

    return new Date().toISOString().substring(0, 10);
  };

  // Encuentra el UUID de la categoría del usuario por nombre (case-insensitive)
  const findCategoryId = (categories: UserCategory[], name: string | null): string | null => {
    if (!name) return null;
    const match = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    return match?.id ?? null;
  };

  const previewTransactions = async () => {
    if (!mapping.date || !mapping.description || !mapping.amount) {
      toast('Por favor mapea al menos Fecha, Descripción e Importe', 'warning');
      return;
    }

    // Cargar categorías del usuario y transacciones existentes en paralelo
    const [catResponse, txResponse] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/transactions'),
    ]);

    const catData = await catResponse.json();
    const categories: UserCategory[] = Array.isArray(catData) ? catData : [];
    setUserCategories(categories);

    const existingData = await txResponse.json();
    const existingTransactions = Array.isArray(existingData) ? existingData : [];
    const existingIds = new Set(existingTransactions.map((t: any) => t.external_id).filter(Boolean));

    const rules = getAllRules();

    const parsed: ParsedTransaction[] = csvData.map(row => {
      const externalId = mapping.external_id ? row[mapping.external_id] : undefined;
      const description = (mapping.description ? row[mapping.description] : '') || '';
      const amount = mapping.amount ? parseAmount(row[mapping.amount] || '') : 0;

      // Auto-categorización por reglas de keywords
      const suggestedCategoryName = autoCategorize(description, rules);

      // Si el CSV ya trae una categoría mapeada y es UUID, usarla; si no, buscar por nombre sugerido
      const csvCategoryRaw = (mapping.category ? row[mapping.category] : '') || '';
      const csvCategoryId = toUuidOrNull(csvCategoryRaw);
      const category_id = csvCategoryId ?? findCategoryId(categories, suggestedCategoryName);

      return {
        date: mapping.date ? parseDate(row[mapping.date] || '') : '',
        description,
        amount,
        category: csvCategoryRaw,
        account: (mapping.account ? row[mapping.account] : '') || '',
        external_id: externalId || '',
        isDuplicate: externalId ? existingIds.has(externalId) : false,
        rawRow: row,
        category_id,
        suggestedCategory: suggestedCategoryName,
      };
    });

    setParsedTransactions(parsed);
    setStep('preview');
  };

  const updateTransactionCategory = (index: number, category_id: string | null) => {
    setParsedTransactions(prev =>
      prev.map((t, i) => i === index ? { ...t, category_id } : t)
    );
  };

  const importTransactions = async () => {
    setStep('importing');
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const transaction of parsedTransactions) {
      if (transaction.isDuplicate) {
        duplicates++;
        continue;
      }

      const absAmount = Math.abs(transaction.amount);
      if (!absAmount || isNaN(absAmount)) {
        errors++;
        continue;
      }

      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: transaction.date || new Date().toISOString().substring(0, 10),
            description: transaction.description || 'Sin descripción',
            amount: absAmount,
            type: transaction.amount >= 0 ? 'income' : 'expense',
            category_id: transaction.category_id,
            account_id: toUuidOrNull(transaction.account ?? ''),
            external_id: transaction.external_id || null,
          })
        });

        if (response.ok) {
          imported++;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error importing transaction:', errorData);
          errors++;
        }
      } catch (error) {
        console.error('Error importing transaction:', error);
        errors++;
      }
    }

    setImportStats({
      total: parsedTransactions.length,
      imported,
      duplicates,
      errors
    });

    toast(`Importación completada: ${imported} transacciones importadas ${duplicates} duplicados omitidos ${errors} errores`, errors > 0 && imported === 0 ? 'error' : 'success');
    resetImport();
  };

  const resetImport = () => {
    setCSVData([]);
    setHeaders([]);
    setMapping({});
    setParsedTransactions([]);
    setSelectedTemplate('');
    setUserCategories([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const categorizedCount = parsedTransactions.filter(t => !t.isDuplicate && t.category_id).length;
  const uncategorizedCount = parsedTransactions.filter(t => !t.isDuplicate && !t.category_id).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Importar CSV</h2>
          <button
            onClick={resetImport}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Reiniciar
          </button>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="text-center py-12">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Upload size={20} />
              Seleccionar archivo CSV
            </label>
            <p className="mt-4 text-sm text-gray-600">
              Soporta formatos de CaixaBank, Santander, BBVA y otros bancos
            </p>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plantilla de banco (opcional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Mapeo manual</option>
                <optgroup label="Plantillas comunes">
                  {COMMON_TEMPLATES.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
                {savedTemplates.length > 0 && (
                  <optgroup label="Mis plantillas">
                    {savedTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['date', 'description', 'amount', 'external_id', 'category', 'account'].map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field === 'date' && 'Fecha *'}
                    {field === 'description' && 'Descripción *'}
                    {field === 'amount' && 'Importe *'}
                    {field === 'external_id' && 'ID Externo (para deduplicación)'}
                    {field === 'category' && 'Categoría'}
                    {field === 'account' && 'Cuenta'}
                  </label>
                  <select
                    value={mapping[field as keyof ColumnMapping] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No mapear</option>
                    {headers.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTemplateName}
                onChange={(e) => setCustomTemplateName(e.target.value)}
                placeholder="Nombre de plantilla personalizada"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveCustomTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Save size={18} />
                Guardar plantilla
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={resetImport}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={previewTransactions}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Vista previa
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-blue-600" size={20} />
                <p className="text-sm text-blue-900">
                  Se importarán <strong>{parsedTransactions.filter(t => !t.isDuplicate).length}</strong> transacciones.
                  {parsedTransactions.filter(t => t.isDuplicate).length > 0 && (
                    <span className="font-semibold ml-1">
                      ({parsedTransactions.filter(t => t.isDuplicate).length} duplicados serán omitidos)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Resumen de categorización */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <Tag size={16} className="text-gray-500" />
              <span className="text-gray-700">
                <strong className="text-green-700">{categorizedCount}</strong> categorizadas automáticamente
                {uncategorizedCount > 0 && (
                  <span className="ml-2 text-orange-600">· <strong>{uncategorizedCount}</strong> sin categoría (puedes asignarla abajo)</span>
                )}
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Categoría</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parsedTransactions.slice(0, 50).map((transaction, index) => (
                    <tr
                      key={index}
                      className={transaction.isDuplicate ? 'bg-yellow-50' : ''}
                    >
                      <td className="px-3 py-2">
                        {transaction.isDuplicate ? (
                          <X className="text-yellow-600" size={16} />
                        ) : (
                          <Check className="text-green-600" size={16} />
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{transaction.date}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 max-w-[200px] truncate" title={transaction.description}>
                        {transaction.description}
                      </td>
                      <td className="px-3 py-2">
                        {transaction.isDuplicate ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <select
                            value={transaction.category_id ?? ''}
                            onChange={(e) => updateTransactionCategory(index, e.target.value || null)}
                            className={`text-xs px-2 py-1 border rounded w-full max-w-[160px] focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              transaction.category_id
                                ? transaction.suggestedCategory
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-300'
                                : 'border-orange-300 bg-orange-50'
                            }`}
                          >
                            <option value="">Sin categoría</option>
                            {userCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-medium whitespace-nowrap ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedTransactions.length > 50 && (
              <p className="text-sm text-gray-600 text-center">
                Mostrando primeras 50 de {parsedTransactions.length} transacciones
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Volver
              </button>
              <button
                onClick={importTransactions}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={18} />
                Importar {parsedTransactions.filter(t => !t.isDuplicate).length} transacciones
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Importando transacciones...</p>
          </div>
        )}
      </div>
    </div>
  );
}
