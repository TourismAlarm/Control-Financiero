'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, RefreshCw, Plus, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface BankLinkView {
  id: string;
  aspsp_name: string;
  aspsp_country: string;
  iban: string | null;
  account_name: string | null;
  valid_until: string | null;
  status: 'active' | 'expired' | 'error' | 'revoked';
  last_synced_at: string | null;
  last_error: string | null;
}

interface LinksResponse {
  configured: boolean;
  migrated: boolean;
  links: BankLinkView[];
}

interface Aspsp {
  name: string;
  country: string;
}

/** Los bancos que usas, para tenerlos a mano arriba de la lista. */
const SHORTCUTS: { label: string; match: RegExp; countries: string[] }[] = [
  { label: 'BBVA', match: /^bbva$/i, countries: ['ES'] },
  { label: 'Revolut', match: /revolut/i, countries: ['ES', 'LT'] },
  { label: 'Trade Republic', match: /trade ?republic/i, countries: ['ES', 'DE'] },
];

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function formatDate(date: string | null): string {
  if (!date) return 'nunca';
  return new Date(date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function BankConnections() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [country, setCountry] = useState('ES');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const { data, isLoading } = useQuery<LinksResponse>({
    queryKey: ['bank-links'],
    queryFn: async () => {
      const res = await fetch('/api/banking/links');
      if (!res.ok) throw new Error('No se pudieron cargar las cuentas');
      return res.json();
    },
  });

  const { data: aspsps, isLoading: loadingAspsps } = useQuery<Aspsp[]>({
    queryKey: ['aspsps', country],
    enabled: showPicker && Boolean(data?.configured),
    queryFn: async () => {
      const res = await fetch(`/api/banking/aspsps?country=${country}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error cargando bancos');
      return body;
    },
  });

  // Mensaje al volver del banco
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('banco');
    if (!result) return;
    if (result === 'ok') {
      setNotice({ type: 'success', text: `Banco conectado. ${params.get('nuevos') || 0} movimientos importados.` });
    } else {
      setNotice({ type: 'error', text: `No se pudo conectar: ${params.get('motivo') || 'error desconocido'}` });
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const connect = async (aspsp: Aspsp) => {
    setConnecting(aspsp.name);
    setNotice(null);
    try {
      const res = await fetch('/api/banking/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aspsp_name: aspsp.name, aspsp_country: aspsp.country }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || 'Error iniciando la conexión');
      window.location.href = body.url; // Al banco a autorizar
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Error' });
      setConnecting(null);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await fetch('/api/banking/sync', { method: 'POST' });
      const text = await res.text();
      let body: { error?: string; results?: unknown } = {};
      try {
        body = JSON.parse(text);
      } catch {
        // Respuesta no JSON (p.ej. timeout de la función): mensaje legible
        throw new Error('La sincronización tardó demasiado. Reintenta: continúa desde donde se quedó.');
      }
      if (!res.ok) throw new Error(body.error || 'Error sincronizando');
      const results = body.results as { inserted: number; status: string; bank: string }[];
      const nuevos = results.reduce((s, r) => s + r.inserted, 0);
      const problems = results.filter((r) => r.status !== 'ok').map((r) => r.bank);
      setNotice({
        type: problems.length ? 'error' : 'success',
        text: problems.length
          ? `${nuevos} movimientos nuevos. Revisa: ${problems.join(', ')}`
          : `${nuevos} movimientos nuevos.`,
      });
      queryClient.invalidateQueries({ queryKey: ['bank-links'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSyncing(false);
    }
  };

  const shortcuts = (aspsps || []).filter((a) => SHORTCUTS.some((s) => s.match.test(a.name)));
  const others = (aspsps || []).filter((a) => !SHORTCUTS.some((s) => s.match.test(a.name)));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <Landmark className="text-gray-600 dark:text-gray-400" size={24} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bancos conectados</h2>
        </div>
        {data?.links?.length ? (
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        ) : null}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Los movimientos entran solos cada mañana. Los traspasos entre tus cuentas no cuentan como gasto.
      </p>

      {notice && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            notice.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      {isLoading ? (
        <Loader2 className="animate-spin text-gray-400" />
      ) : !data?.configured ? (
        <p className="text-sm text-orange-700 dark:text-orange-300">
          Falta configurar Enable Banking en Vercel (ENABLE_BANKING_APP_ID y ENABLE_BANKING_PRIVATE_KEY).
        </p>
      ) : !data.migrated ? (
        <p className="text-sm text-orange-700 dark:text-orange-300">
          Falta aplicar la migración <code>011_bank_sync.sql</code> en Supabase.
        </p>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {data.links.map((link) => {
              const days = daysUntil(link.valid_until);
              const expired = link.status === 'expired' || (days !== null && days <= 0);
              const soon = !expired && days !== null && days <= 14;
              return (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {link.aspsp_name} {link.iban}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Última sincronización: {formatDate(link.last_synced_at)}
                    </p>
                    {link.status === 'error' && link.last_error && (
                      <p className="text-xs text-red-600 dark:text-red-400 truncate">{link.last_error}</p>
                    )}
                  </div>
                  {expired || soon ? (
                    <button
                      type="button"
                      onClick={() => connect({ name: link.aspsp_name, country: link.aspsp_country })}
                      disabled={connecting !== null}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-800 hover:bg-orange-200"
                    >
                      <AlertTriangle size={14} />
                      {expired ? 'Reconectar' : `Renovar (${days} d)`}
                    </button>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                      <CheckCircle2 size={14} />
                      {days !== null ? `${days} d` : 'Activo'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {!showPicker ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Conectar un banco
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">País del banco</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="ES">España</option>
                  <option value="DE">Alemania</option>
                  <option value="LT">Lituania</option>
                </select>
              </div>
              {loadingAspsps ? (
                <Loader2 className="animate-spin text-gray-400" />
              ) : (
                <>
                  {shortcuts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {shortcuts.map((a) => (
                        <button
                          key={a.name}
                          type="button"
                          onClick={() => connect(a)}
                          disabled={connecting !== null}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                        >
                          {connecting === a.name ? 'Abriendo banco…' : a.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const a = others.find((o) => o.name === e.target.value);
                      if (a) connect(a);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  >
                    <option value="" disabled>
                      Otro banco ({others.length})
                    </option>
                    {others.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {shortcuts.length === 0 && (
                    <p className="text-xs text-gray-500">
                      BBVA, Revolut y Trade Republic no aparecen en este país; prueba con otro.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
