'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CSVImporter({ onSuccess }: { onSuccess?: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/banking/csv/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir archivo');
      }

      setResult(data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Upload className="text-blue-600" size={24} />
        Importar CSV Bancario
      </h3>

      {!result && !error && (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-gray-600">Procesando archivo...</p>
            </div>
          ) : (
            <>
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Arrastra tu archivo CSV aquí
              </p>
              <p className="text-sm text-gray-500 mb-4">
                o haz click para seleccionar
              </p>
              <div className="text-xs text-gray-400">
                <p>Soportado: BBVA, Revolut, Santander, CaixaBank</p>
              </div>
            </>
          )}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-green-600" size={24} />
            <h4 className="font-bold text-green-800">Importación Exitosa</h4>
          </div>

          <div className="space-y-2 text-sm">
            <p><strong>Banco:</strong> {result.bank}</p>
            <p><strong>Total transacciones:</strong> {result.stats.total}</p>
            <p className="text-green-700"><strong>Nuevas:</strong> {result.stats.new}</p>
            <p className="text-gray-600"><strong>Duplicadas (ignoradas):</strong> {result.stats.duplicated}</p>
            {result.stats.errors > 0 && (
              <p className="text-orange-600"><strong>Errores:</strong> {result.stats.errors}</p>
            )}
          </div>

          <button
            onClick={() => {
              setResult(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Importar otro archivo
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-600" size={24} />
            <h4 className="font-bold text-red-800">Error</h4>
          </div>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
