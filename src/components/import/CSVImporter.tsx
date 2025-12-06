'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, Download, Check, X, AlertCircle, Save } from 'lucide-react';

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

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  account?: string;
  external_id?: string;
  isDuplicate?: boolean;
  rawRow: CSVRow;
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

export function CSVImporter() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<BankTemplate[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');

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

        // Intentar auto-detectar columnas
        autoDetectColumns(Object.keys(data[0] || {}));
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error al leer el archivo CSV');
      }
    });
  };

  const autoDetectColumns = (cols: string[]) => {
    const detected: ColumnMapping = {};

    cols.forEach(col => {
      const lower = col.toLowerCase();

      // Detectar fecha
      if (lower.includes('fecha') || lower.includes('date') || lower.includes('f.valor')) {
        detected.date = col;
      }
      // Detectar descripción
      else if (lower.includes('concepto') || lower.includes('descripcion') || lower.includes('description')) {
        detected.description = col;
      }
      // Detectar importe
      else if (lower.includes('importe') || lower.includes('amount') || lower.includes('cantidad')) {
        detected.amount = col;
      }
      // Detectar ID externo
      else if (lower.includes('referencia') || lower.includes('reference') || lower.includes('num') || lower.includes('id')) {
        detected.external_id = col;
      }
      // Detectar categoría
      else if (lower.includes('categoria') || lower.includes('category')) {
        detected.category = col;
      }
      // Detectar cuenta
      else if (lower.includes('cuenta') || lower.includes('account')) {
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
      alert('Por favor ingresa un nombre para la plantilla');
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
    alert('Plantilla guardada exitosamente');
  };

  const parseAmount = (value: string): number => {
    // Remover símbolos de moneda y espacios
    let cleaned = value.replace(/[€$£\s]/g, '');

    // Manejar formatos europeos (1.234,56) y americanos (1,234.56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Si tiene ambos, el último es el decimal
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        // Formato europeo
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato americano
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Solo coma - asumir formato europeo
      cleaned = cleaned.replace(',', '.');
    }

    return parseFloat(cleaned) || 0;
  };

  const parseDate = (value: string): string => {
    // Intentar diferentes formatos de fecha
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (format === formats[0] || format === formats[2]) {
          // DD/MM/YYYY o DD-MM-YYYY
          return `${match[3]}-${match[2]}-${match[1]}`;
        } else {
          // YYYY-MM-DD
          return value;
        }
      }
    }

    return value; // Devolver sin cambios si no coincide
  };

  const previewTransactions = async () => {
    if (!mapping.date || !mapping.description || !mapping.amount) {
      alert('Por favor mapea al menos Fecha, Descripción e Importe');
      return;
    }

    // Obtener transacciones existentes para detectar duplicados
    const response = await fetch('/api/transactions');
    const existingTransactions = await response.json();
    const existingIds = new Set(existingTransactions.map((t: any) => t.external_id).filter(Boolean));

    const parsed: ParsedTransaction[] = csvData.map(row => {
      const externalId = mapping.external_id ? row[mapping.external_id] : undefined;

      return {
        date: mapping.date ? parseDate(row[mapping.date] || '') : '',
        description: (mapping.description ? row[mapping.description] : '') || '',
        amount: mapping.amount ? parseAmount(row[mapping.amount] || '') : 0,
        category: (mapping.category ? row[mapping.category] : '') || '',
        account: (mapping.account ? row[mapping.account] : '') || '',
        external_id: externalId || '',
        isDuplicate: externalId ? existingIds.has(externalId) : false,
        rawRow: row
      };
    });

    setParsedTransactions(parsed);
    setStep('preview');
  };

  const importTransactions = async () => {
    setStep('importing');
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const transaction of parsedTransactions) {
      if (transaction.isDuplicate) {
        duplicates++;
        continue;
      }

      try {
        // Determinar tipo basado en el signo del monto
        const isIncome = transaction.amount >= 0;
        const type = isIncome ? 'income' : 'expense';

        // El amount siempre debe ser positivo según el schema
        const amount = Math.abs(transaction.amount);

        // Validar que category_id y account_id sean UUIDs válidos o null
        const isValidUUID = (str: string) => {
          if (!str) return false;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };

        const category_id = isValidUUID(transaction.category || '') ? transaction.category : null;
        const account_id = isValidUUID(transaction.account || '') ? transaction.account : null;

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            amount,
            description: transaction.description || 'Sin descripción',
            date: transaction.date || new Date().toISOString().split('T')[0],
            category_id,
            account_id,
            external_id: transaction.external_id || undefined,
            notes: null,
            tags: null,
          })
        });

        if (response.ok) {
          imported++;
        } else {
          const errorData = await response.json();
          errors++;
          errorDetails.push(`${transaction.description}: ${errorData.error || 'Error desconocido'}`);
          console.error('Error importing transaction:', errorData);
        }
      } catch (error) {
        console.error('Error importing transaction:', error);
        errors++;
        errorDetails.push(`${transaction.description}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    let message = `Importación completada:\n${imported} transacciones importadas\n${duplicates} duplicados omitidos\n${errors} errores`;

    if (errorDetails.length > 0 && errorDetails.length <= 5) {
      message += '\n\nDetalles de errores:\n' + errorDetails.join('\n');
    } else if (errorDetails.length > 5) {
      message += '\n\nPrimeros 5 errores:\n' + errorDetails.slice(0, 5).join('\n');
    }

    alert(message);
    resetImport();
  };

  const resetImport = () => {
    setCSVData([]);
    setHeaders([]);
    setMapping({});
    setParsedTransactions([]);
    setSelectedTemplate('');
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
                  Se importarán {parsedTransactions.filter(t => !t.isDuplicate).length} transacciones.
                  {parsedTransactions.filter(t => t.isDuplicate).length > 0 && (
                    <span className="font-semibold ml-1">
                      ({parsedTransactions.filter(t => t.isDuplicate).length} duplicados serán omitidos)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Descripción</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parsedTransactions.slice(0, 50).map((transaction, index) => (
                    <tr
                      key={index}
                      className={transaction.isDuplicate ? 'bg-yellow-50' : ''}
                    >
                      <td className="px-4 py-2">
                        {transaction.isDuplicate ? (
                          <X className="text-yellow-600" size={16} />
                        ) : (
                          <Check className="text-green-600" size={16} />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{transaction.date}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{transaction.description}</td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
