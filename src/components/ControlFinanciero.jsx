'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, Save, Calendar, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'controlFinancieroEstado';
const HISTORY_KEY = 'controlFinancieroHistorial';

export default function ControlFinanciero() {
  const fileInputRef = useRef(null);

  // Estado inicial
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [mesActual, setMesActual] = useState(
    new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  // Estado para notificaciones
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

  // Datos principales
  const [ingresos, setIngresos] = useState([]);
  const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: '', monto: '', tipo: 'Fijo' });

  const [gastosFijos, setGastosFijos] = useState([]);
  const [nuevoGastoFijo, setNuevoGastoFijo] = useState({ concepto: '', monto: '' });

  const [gastosVariables, setGastosVariables] = useState([]);
  const [nuevoGastoVariable, setNuevoGastoVariable] = useState({ concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0] });

  const [deudas, setDeudas] = useState([]);
  const [nuevaDeuda, setNuevaDeuda] = useState({ nombre: '', monto: '' });

  const [objetivos, setObjetivos] = useState([]);
  const [nuevoObjetivo, setNuevoObjetivo] = useState({ nombre: '', meta: '', actual: '' });

  const [historialMensual, setHistorialMensual] = useState([]);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(true);

  // Cargar datos
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      if (datos) {
        const parsed = JSON.parse(datos);
        setNombreUsuario(parsed.nombreUsuario || '');
        setMesActual(parsed.mesActual || mesActual);
        setIngresos(Array.isArray(parsed.ingresos) ? parsed.ingresos : []);
        setGastosFijos(Array.isArray(parsed.gastosFijos) ? parsed.gastosFijos : []);
        setGastosVariables(Array.isArray(parsed.gastosVariables) ? parsed.gastosVariables : []);
        setDeudas(Array.isArray(parsed.deudas) ? parsed.deudas : []);
        setObjetivos(Array.isArray(parsed.objetivos) ? parsed.objetivos : []);

        if (
          [parsed.ingresos, parsed.gastosFijos, parsed.gastosVariables, parsed.deudas, parsed.objetivos].some(
            (l) => Array.isArray(l) && l.length > 0
          )
        ) {
          setMostrarBienvenida(false);
        }
      }

      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) {
        const parsedH = JSON.parse(hist);
        if (Array.isArray(parsedH)) setHistorialMensual(parsedH);
      }
    } catch (e) {
      console.error('Error leyendo localStorage', e);
    }
  }, []);

  // Guardar datos
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const estado = { nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (e) {
      console.error('Error guardando estado', e);
    }
  }, [nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos]);

  // Guardar historial
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historialMensual));
    } catch (e) {
      console.error('Error guardando historial', e);
    }
  }, [historialMensual]);

  // Notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 3000);
  };

  // Totales sencillos
  const totalIngresos = ingresos.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);
  const totalGastosFijos = gastosFijos.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);
  const totalGastosVariables = gastosVariables.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);
  const totalGastos = totalGastosFijos + totalGastosVariables;
  const totalDeudas = deudas.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);
  const saldoDisponible = totalIngresos - totalGastos;

  // CRUD - ingresos simple
  const añadirIngreso = () => {
    if (!nuevoIngreso.concepto || !nuevoIngreso.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoIngreso.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    const nuevo = { id: Date.now(), concepto: nuevoIngreso.concepto, monto, tipo: nuevoIngreso.tipo };
    setIngresos((p) => [...p, nuevo]);
    setNuevoIngreso({ concepto: '', monto: '', tipo: 'Fijo' });
    setMostrarBienvenida(false);
    mostrarNotificacion('Ingreso añadido', 'success');
  };

  const eliminarIngreso = (id) => {
    setIngresos((p) => p.filter((i) => i.id !== id));
    mostrarNotificacion('Ingreso eliminado', 'info');
  };

  // CRUD - gastos fijos
  const añadirGastoFijo = () => {
    if (!nuevoGastoFijo.concepto || !nuevoGastoFijo.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoGastoFijo.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    const nuevo = { id: Date.now(), concepto: nuevoGastoFijo.concepto, monto };
    setGastosFijos((p) => [...p, nuevo]);
    setNuevoGastoFijo({ concepto: '', monto: '' });
    mostrarNotificacion('Gasto fijo añadido', 'success');
  };

  const eliminarGastoFijo = (id) => {
    setGastosFijos((p) => p.filter((g) => g.id !== id));
    mostrarNotificacion('Gasto fijo eliminado', 'info');
  };

  // CRUD - gastos variables
  const añadirGastoVariable = () => {
    if (!nuevoGastoVariable.concepto || !nuevoGastoVariable.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoGastoVariable.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    const nuevo = { id: Date.now(), concepto: nuevoGastoVariable.concepto, monto, fecha: nuevoGastoVariable.fecha };
    setGastosVariables((p) => [...p, nuevo]);
    setNuevoGastoVariable({ concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0] });
    mostrarNotificacion('Gasto variable añadido', 'success');
  };

  const eliminarGastoVariable = (id) => {
    setGastosVariables((p) => p.filter((g) => g.id !== id));
    mostrarNotificacion('Gasto variable eliminado', 'info');
  };

  // CRUD - deudas
  const añadirDeuda = () => {
    if (!nuevaDeuda.nombre || !nuevaDeuda.monto) return mostrarNotificacion('Completa nombre y monto', 'error');
    const monto = parseFloat(nuevaDeuda.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    const nuevo = { id: Date.now(), nombre: nuevaDeuda.nombre, monto };
    setDeudas((p) => [...p, nuevo]);
    setNuevaDeuda({ nombre: '', monto: '' });
    mostrarNotificacion('Deuda añadida', 'success');
  };

  const eliminarDeuda = (id) => {
    setDeudas((p) => p.filter((d) => d.id !== id));
    mostrarNotificacion('Deuda eliminada', 'info');
  };

  // CRUD - objetivos
  const añadirObjetivo = () => {
    if (!nuevoObjetivo.nombre || !nuevoObjetivo.meta) return mostrarNotificacion('Completa nombre y meta', 'error');
    const meta = parseFloat(nuevoObjetivo.meta);
    const actual = parseFloat(nuevoObjetivo.actual) || 0;
    if (Number.isNaN(meta) || meta <= 0) return mostrarNotificacion('Meta inválida', 'error');

    const nuevo = { id: Date.now(), nombre: nuevoObjetivo.nombre, meta, actual };
    setObjetivos((p) => [...p, nuevo]);
    setNuevoObjetivo({ nombre: '', meta: '', actual: '' });
    mostrarNotificacion('Objetivo añadido', 'success');
  };

  const eliminarObjetivo = (id) => {
    setObjetivos((p) => p.filter((o) => o.id !== id));
    mostrarNotificacion('Objetivo eliminado', 'info');
  };

  // Export / Import
  const exportarDatos = () => {
    try {
      const datos = {
        nombreUsuario,
        mesActual,
        ingresos,
        gastosFijos,
        gastosVariables,
        deudas,
        objetivos,
        historialMensual,
        fechaExportacion: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `control-financiero-${mesActual.replace(/\s/g, '-')}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      mostrarNotificacion('Datos exportados', 'success');
    } catch (e) {
      mostrarNotificacion('Error exportando datos', 'error');
    }
  };

  const importarDatos = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const datos = JSON.parse(e.target.result);
        setNombreUsuario(datos.nombreUsuario || '');
        setMesActual(datos.mesActual || mesActual);
        setIngresos(Array.isArray(datos.ingresos) ? datos.ingresos : []);
        setGastosFijos(Array.isArray(datos.gastosFijos) ? datos.gastosFijos : []);
        setGastosVariables(Array.isArray(datos.gastosVariables) ? datos.gastosVariables : []);
        setDeudas(Array.isArray(datos.deudas) ? datos.deudas : []);
        setObjetivos(Array.isArray(datos.objetivos) ? datos.objetivos : []);
        setHistorialMensual(Array.isArray(datos.historialMensual) ? datos.historialMensual : []);
        mostrarNotificacion('Datos importados', 'success');
        setMostrarBienvenida(false);
      } catch (e) {
        mostrarNotificacion('Archivo inválido', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Historial mensual básico
  const crearSnapshot = () => ({
    id: Date.now(),
    mes: mesActual,
    fechaGuardado: new Date().toISOString(),
    nombreUsuario,
    ingresos: ingresos.map((i) => ({ ...i })),
    gastosFijos: gastosFijos.map((g) => ({ ...g })),
    gastosVariables: gastosVariables.map((g) => ({ ...g })),
    deudas: deudas.map((d) => ({ ...d })),
    objetivos: objetivos.map((o) => ({ ...o })),
    totales: { totalIngresos, totalGastos, saldoDisponible },
  });

  const guardarHistorial = () => {
    const snap = crearSnapshot();
    setHistorialMensual((p) => {
      const index = p.findIndex((it) => (it.mes || '').toLowerCase() === (snap.mes || '').toLowerCase());

      if (index !== -1) {
        const copy = [...p];
        copy[index] = { ...snap, id: copy[index].id };
        mostrarNotificacion('Historial actualizado', 'success');
        return copy;
      }

      mostrarNotificacion('Historial guardado', 'success');
      return [...p, snap];
    });
  };

  const restaurarHistorial = (id) => {
    const reg = historialMensual.find((h) => h.id === id);
    if (!reg) return mostrarNotificacion('Registro no encontrado', 'error');

    setNombreUsuario(reg.nombreUsuario || '');
    setMesActual(reg.mes || mesActual);
    setIngresos(Array.isArray(reg.ingresos) ? reg.ingresos : []);
    setGastosFijos(Array.isArray(reg.gastosFijos) ? reg.gastosFijos : []);
    setGastosVariables(Array.isArray(reg.gastosVariables) ? reg.gastosVariables : []);
    setDeudas(Array.isArray(reg.deudas) ? reg.deudas : []);
    setObjetivos(Array.isArray(reg.objetivos) ? reg.objetivos : []);
    setMostrarBienvenida(false);
    mostrarNotificacion(`Datos de ${reg.mes} restaurados`, 'success');
  };

  const eliminarHistorial = (id) => {
    setHistorialMensual((p) => p.filter((h) => h.id !== id));
    mostrarNotificacion('Registro eliminado', 'info');
  };

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      {notificacion.show && (
        <div
          className={`fixed top-4 right-4 p-3 rounded shadow ${
            notificacion.tipo === 'success' ? 'bg-green-500' : notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          <span className="text-white">{notificacion.mensaje}</span>
        </div>
      )}

      <header className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Control Financiero</h1>
        <p className="text-sm text-gray-600 mb-4">
          Usuario: <strong>{nombreUsuario || 'Anónimo'}</strong> — Mes: <strong>{mesActual}</strong>
        </p>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Añadir ingreso</h2>
          <div className="flex gap-2">
            <input
              aria-label="concepto"
              placeholder="Concepto"
              value={nuevoIngreso.concepto}
              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, concepto: e.target.value })}
              className="border p-2 rounded flex-1"
            />
            <input
              aria-label="monto"
              placeholder="Monto"
              value={nuevoIngreso.monto}
              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, monto: e.target.value })}
              className="border p-2 rounded w-32"
            />
            <button onClick={añadirIngreso} className="bg-blue-600 text-white px-3 rounded inline-flex items-center gap-2">
              <Plus size={16} /> Añadir
            </button>
          </div>
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Ingresos</h2>
          {ingresos.length === 0 ? (
            <p className="text-sm text-gray-500">No hay ingresos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {ingresos.map((i) => (
                <li key={i.id} className="flex justify-between items-center border p-2 rounded">
                  <div>
                    <div className="font-medium">{i.concepto}</div>
                    <div className="text-sm text-gray-500">{i.tipo}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold">{(i.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarIngreso(i.id)} className="text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-sm text-gray-700">
            Total ingresos: <strong>{totalIngresos.toFixed(2)} €</strong>
          </div>
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Historial mensual</h2>
          <div className="flex gap-2">
            <button
              onClick={guardarHistorial}
              className="bg-purple-600 text-white px-3 py-2 rounded inline-flex items-center gap-2"
            >
              <Save size={16} /> Guardar mes
            </button>
            <button onClick={exportarDatos} className="bg-green-600 text-white px-3 py-2 rounded inline-flex items-center gap-2">
              <Download size={16} /> Exportar
            </button>
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="bg-gray-200 px-3 py-2 rounded inline-flex items-center gap-2"
            >
              <Upload size={16} /> Importar
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importarDatos} className="hidden" />
          </div>

          {historialMensual.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">Aún no hay registros. Guarda el mes actual para empezar.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...historialMensual].slice().reverse().map((h) => (
                <li key={h.id} className="border rounded p-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{h.mes}</div>
                    <div className="text-xs text-gray-500">Guardado: {new Date(h.fechaGuardado).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => restaurarHistorial(h.id)} className="px-2 py-1 border rounded text-sm">
                      Restaurar
                    </button>
                    <button onClick={() => eliminarHistorial(h.id)} className="px-2 py-1 border rounded text-sm text-red-600">
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gastos Fijos */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Gastos Fijos</h2>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Concepto"
              value={nuevoGastoFijo.concepto}
              onChange={(e) => setNuevoGastoFijo({ ...nuevoGastoFijo, concepto: e.target.value })}
              className="border p-2 rounded flex-1"
            />
            <input
              placeholder="Monto"
              value={nuevoGastoFijo.monto}
              onChange={(e) => setNuevoGastoFijo({ ...nuevoGastoFijo, monto: e.target.value })}
              className="border p-2 rounded w-32"
            />
            <button onClick={añadirGastoFijo} className="bg-red-600 text-white px-3 rounded inline-flex items-center gap-2">
              <Plus size={16} /> Añadir
            </button>
          </div>
          {gastosFijos.length === 0 ? (
            <p className="text-sm text-gray-500">No hay gastos fijos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {gastosFijos.map((g) => (
                <li key={g.id} className="flex justify-between items-center border p-2 rounded">
                  <div className="font-medium">{g.concepto}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold">{(g.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarGastoFijo(g.id)} className="text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-sm text-gray-700">
            Total gastos fijos: <strong>{totalGastosFijos.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Gastos Variables */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Gastos Variables</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="date"
              value={nuevoGastoVariable.fecha}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, fecha: e.target.value })}
              className="border p-2 rounded w-40"
            />
            <input
              placeholder="Concepto"
              value={nuevoGastoVariable.concepto}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, concepto: e.target.value })}
              className="border p-2 rounded flex-1"
            />
            <input
              placeholder="Monto"
              value={nuevoGastoVariable.monto}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, monto: e.target.value })}
              className="border p-2 rounded w-32"
            />
            <button onClick={añadirGastoVariable} className="bg-orange-600 text-white px-3 rounded inline-flex items-center gap-2">
              <Plus size={16} /> Añadir
            </button>
          </div>
          {gastosVariables.length === 0 ? (
            <p className="text-sm text-gray-500">No hay gastos variables registrados.</p>
          ) : (
            <ul className="space-y-2">
              {gastosVariables.map((g) => (
                <li key={g.id} className="flex justify-between items-center border p-2 rounded">
                  <div>
                    <div className="font-medium">{g.concepto}</div>
                    <div className="text-xs text-gray-500">{g.fecha}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold">{(g.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarGastoVariable(g.id)} className="text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-sm text-gray-700">
            Total gastos variables: <strong>{totalGastosVariables.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Deudas */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Deudas</h2>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Nombre de la deuda"
              value={nuevaDeuda.nombre}
              onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, nombre: e.target.value })}
              className="border p-2 rounded flex-1"
            />
            <input
              placeholder="Monto"
              value={nuevaDeuda.monto}
              onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, monto: e.target.value })}
              className="border p-2 rounded w-32"
            />
            <button onClick={añadirDeuda} className="bg-purple-600 text-white px-3 rounded inline-flex items-center gap-2">
              <Plus size={16} /> Añadir
            </button>
          </div>
          {deudas.length === 0 ? (
            <p className="text-sm text-gray-500">No hay deudas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {deudas.map((d) => (
                <li key={d.id} className="flex justify-between items-center border p-2 rounded">
                  <div className="font-medium">{d.nombre}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold">{(d.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarDeuda(d.id)} className="text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-sm text-gray-700">
            Total deudas: <strong>{totalDeudas.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Objetivos */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Objetivos de Ahorro</h2>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Nombre del objetivo"
              value={nuevoObjetivo.nombre}
              onChange={(e) => setNuevoObjetivo({ ...nuevoObjetivo, nombre: e.target.value })}
              className="border p-2 rounded flex-1"
            />
            <input
              placeholder="Meta"
              value={nuevoObjetivo.meta}
              onChange={(e) => setNuevoObjetivo({ ...nuevoObjetivo, meta: e.target.value })}
              className="border p-2 rounded w-32"
            />
            <input
              placeholder="Actual"
              value={nuevoObjetivo.actual}
              onChange={(e) => setNuevoObjetivo({ ...nuevoObjetivo, actual: e.target.value })}
              className="border p-2 rounded w-32"
            />
            <button onClick={añadirObjetivo} className="bg-teal-600 text-white px-3 rounded inline-flex items-center gap-2">
              <Plus size={16} /> Añadir
            </button>
          </div>
          {objetivos.length === 0 ? (
            <p className="text-sm text-gray-500">No hay objetivos de ahorro.</p>
          ) : (
            <ul className="space-y-3">
              {objetivos.map((o) => {
                const progreso = (o.actual / o.meta) * 100;
                return (
                  <li key={o.id} className="border p-3 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{o.nombre}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          {o.actual.toFixed(2)} / {o.meta.toFixed(2)} €
                        </div>
                        <button onClick={() => eliminarObjetivo(o.id)} className="text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progreso, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{progreso.toFixed(0)}% completado</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Resumen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-green-50 rounded">
              Ingresos: <div className="font-bold">{totalIngresos.toFixed(2)} €</div>
            </div>
            <div className="p-3 bg-red-50 rounded">
              Gastos: <div className="font-bold">{totalGastos.toFixed(2)} €</div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              Balance: <div className="font-bold">{saldoDisponible.toFixed(2)} €</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              Deudas: <div className="font-bold">{totalDeudas.toFixed(2)} €</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
