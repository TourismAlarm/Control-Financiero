'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Plus, Trash2, Download, Upload, Save, Calendar, AlertCircle, Moon, Sun, LogOut } from 'lucide-react';

const STORAGE_KEY = 'controlFinancieroEstado';
const HISTORY_KEY = 'controlFinancieroHistorial';
const THEME_KEY = 'controlFinancieroTheme';

export default function ControlFinanciero({ user }) {
  const fileInputRef = useRef(null);

  // Estado inicial
  const [nombreUsuario, setNombreUsuario] = useState(user?.name || 'Anónimo');
  const [mesActual, setMesActual] = useState(
    new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  // Estado para notificaciones
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

  // Estado para modo oscuro
  const [darkMode, setDarkMode] = useState(false);

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

  // Cargar y guardar tema
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}>
      {notificacion.show && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl z-50 transform transition-all duration-300 animate-in slide-in-from-right ${
            notificacion.tipo === 'success' ? 'bg-green-500' : notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          <span className="text-white font-medium">{notificacion.mensaje}</span>
        </div>
      )}

      <header className={`sticky top-0 z-40 backdrop-blur-lg ${darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'} border-b transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                💰 Control Financiero
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="font-medium">{user?.name || nombreUsuario}</span> • <span>{mesActual}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                  darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                  darkMode ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
                aria-label="Cerrar sesión"
              >
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Resumen Cards - Movido arriba */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${darkMode ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-400 to-green-500'}`}>
            <p className="text-white/80 text-sm font-medium mb-2">💰 Ingresos</p>
            <p className="text-white text-3xl font-bold">{totalIngresos.toFixed(2)} €</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${darkMode ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-red-400 to-red-500'}`}>
            <p className="text-white/80 text-sm font-medium mb-2">💸 Gastos</p>
            <p className="text-white text-3xl font-bold">{totalGastos.toFixed(2)} €</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
            <p className="text-white/80 text-sm font-medium mb-2">💵 Balance</p>
            <p className="text-white text-3xl font-bold">{saldoDisponible.toFixed(2)} €</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${darkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
            <p className="text-white/80 text-sm font-medium mb-2">🏦 Deudas</p>
            <p className="text-white text-3xl font-bold">{totalDeudas.toFixed(2)} €</p>
          </div>
        </div>

        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>✨ Añadir Ingreso</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              aria-label="concepto"
              placeholder="Concepto"
              value={nuevoIngreso.concepto}
              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, concepto: e.target.value })}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
                  : 'bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            <input
              aria-label="monto"
              placeholder="Monto"
              value={nuevoIngreso.monto}
              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, monto: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
                  : 'bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            <button
              onClick={añadirIngreso}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <Plus size={20} /> Añadir
            </button>
          </div>
        </section>

        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Ingresos</h2>
          {ingresos.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay ingresos registrados.</p>
          ) : (
            <ul className="space-y-3">
              {ingresos.map((i) => (
                <li key={i.id} className={`flex justify-between items-center p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{i.concepto}</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{i.tipo}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`font-bold text-lg ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{(i.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarIngreso(i.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
            Total ingresos: <strong className={darkMode ? 'text-green-400' : 'text-green-600'}>{totalIngresos.toFixed(2)} €</strong>
          </div>
        </section>

        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📅 Historial mensual</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={guardarHistorial}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <Save size={18} /> Guardar mes
            </button>
            <button onClick={exportarDatos} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
              <Download size={18} /> Exportar
            </button>
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`px-4 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
            >
              <Upload size={18} /> Importar
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importarDatos} className="hidden" />
          </div>

          {historialMensual.length === 0 ? (
            <p className={`text-sm mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aún no hay registros. Guarda el mes actual para empezar.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...historialMensual].slice().reverse().map((h) => (
                <li key={h.id} className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2 flex justify-between items-center`}>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{h.mes}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Guardado: {new Date(h.fechaGuardado).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => restaurarHistorial(h.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}>
                      Restaurar
                    </button>
                    <button onClick={() => eliminarHistorial(h.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${darkMode ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}>
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gastos Fijos */}
        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏠 Gastos Fijos</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <input
              placeholder="Concepto"
              value={nuevoGastoFijo.concepto}
              onChange={(e) => setNuevoGastoFijo({ ...nuevoGastoFijo, concepto: e.target.value })}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-red-500/20'
                  : 'bg-white border-gray-200 focus:border-red-500 focus:ring-red-500/20'
              }`}
            />
            <input
              placeholder="Monto"
              value={nuevoGastoFijo.monto}
              onChange={(e) => setNuevoGastoFijo({ ...nuevoGastoFijo, monto: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-red-500/20'
                  : 'bg-white border-gray-200 focus:border-red-500 focus:ring-red-500/20'
              }`}
            />
            <button onClick={añadirGastoFijo} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
              <Plus size={20} /> Añadir
            </button>
          </div>
          {gastosFijos.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay gastos fijos registrados.</p>
          ) : (
            <ul className="space-y-3">
              {gastosFijos.map((g) => (
                <li key={g.id} className={`flex justify-between items-center p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{g.concepto}</div>
                  <div className="flex items-center gap-3">
                    <div className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{(g.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarGastoFijo(g.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
            Total gastos fijos: <strong className={darkMode ? 'text-red-400' : 'text-red-600'}>{totalGastosFijos.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Gastos Variables */}
        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🛒 Gastos Variables</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <input
              type="date"
              value={nuevoGastoVariable.fecha}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, fecha: e.target.value })}
              className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                  : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
              }`}
            />
            <input
              placeholder="Concepto"
              value={nuevoGastoVariable.concepto}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, concepto: e.target.value })}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                  : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
              }`}
            />
            <input
              placeholder="Monto"
              value={nuevoGastoVariable.monto}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, monto: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                  : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
              }`}
            />
            <button onClick={añadirGastoVariable} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
              <Plus size={20} /> Añadir
            </button>
          </div>
          {gastosVariables.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay gastos variables registrados.</p>
          ) : (
            <ul className="space-y-3">
              {gastosVariables.map((g) => (
                <li key={g.id} className={`flex justify-between items-center p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{g.concepto}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>📅 {g.fecha}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{(g.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarGastoVariable(g.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
            Total gastos variables: <strong className={darkMode ? 'text-orange-400' : 'text-orange-600'}>{totalGastosVariables.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Deudas */}
        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💳 Deudas</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <input
              placeholder="Nombre de la deuda"
              value={nuevaDeuda.nombre}
              onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, nombre: e.target.value })}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                  : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
              }`}
            />
            <input
              placeholder="Monto"
              value={nuevaDeuda.monto}
              onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, monto: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                  : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
              }`}
            />
            <button onClick={añadirDeuda} className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
              <Plus size={20} /> Añadir
            </button>
          </div>
          {deudas.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay deudas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {deudas.map((d) => (
                <li key={d.id} className={`flex justify-between items-center p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{d.nombre}</div>
                  <div className="flex items-center gap-3">
                    <div className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{(d.monto || 0).toFixed(2)} €</div>
                    <button onClick={() => eliminarDeuda(d.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
            Total deudas: <strong className={darkMode ? 'text-purple-400' : 'text-purple-600'}>{totalDeudas.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Objetivos */}
        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🎯 Objetivos de Ahorro</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <input
              placeholder="Nombre del objetivo"
              value={nuevoObjetivo.nombre}
              onChange={(e) => setNuevoObjetivo({ ...nuevoObjetivo, nombre: e.target.value })}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                  : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
            />
            <input
              placeholder="Meta"
              value={nuevoObjetivo.meta}
              onChange={(e) => setNuevoObjetivo({ ...nuevoObjetivo, meta: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                  : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
            />
            <input
              placeholder="Actual"
              value={nuevoObjetivo.actual}
              onChange={(e) => setNuevoObjetivo({ ...nuevoObjetivo, actual: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                  : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
            />
            <button onClick={añadirObjetivo} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
              <Plus size={20} /> Añadir
            </button>
          </div>
          {objetivos.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay objetivos de ahorro.</p>
          ) : (
            <ul className="space-y-4">
              {objetivos.map((o) => {
                const progreso = (o.actual / o.meta) * 100;
                return (
                  <li key={o.id} className={`p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className={`font-medium text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{o.nombre}</div>
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-medium ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                          {o.actual.toFixed(2)} / {o.meta.toFixed(2)} €
                        </div>
                        <button onClick={() => eliminarObjetivo(o.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(progreso, 100)}%` }}
                      />
                    </div>
                    <div className={`text-sm mt-2 font-medium ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>{progreso.toFixed(0)}% completado</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </main>
    </div>
  );
}
