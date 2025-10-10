'use client';'use client';



import { useState, useRef, useEffect } from 'react';import { useState, useRef, useEffect } from 'react';

import { Plus, Trash2, Download, Upload, Save, Calendar } from 'lucide-react';+

+import { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'controlFinancieroEstado'; import { Plus, Trash2, Download, Upload, TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, BarChart3, Target, Edit2, Save, X, Calendar, CreditCard, ShoppingCart, Home, PiggyBank, AlertCircle, CheckCircle } from 'lucide-react';

const HISTORY_KEY = 'controlFinancieroHistorial'; import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Area, AreaChart } from 'recharts';

 

export default function ControlFinanciero() {+const STORAGE_KEY = 'controlFinancieroEstado';

  const fileInputRef = useRef(null);+const HISTORY_KEY = 'controlFinancieroHistorial';

+

  // Estado inicial export default function ControlFinanciero() {

  const [nombreUsuario, setNombreUsuario] = useState('');   const fileInputRef = useRef(null);

  const [mesActual, setMesActual] = useState(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));   

     // Estado inicial

  // Estado para notificaciones   const [nombreUsuario, setNombreUsuario] = useState('');

  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });   const [mesActual, setMesActual] = useState(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));

     

  // Datos principales   // Estado para notificaciones

  const [ingresos, setIngresos] = useState([]);   const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

  const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: '', monto: '', tipo: 'Fijo' });   

  const [gastosFijos, setGastosFijos] = useState([]);   // Ingresos (múltiples fuentes)

  const [gastosVariables, setGastosVariables] = useState([]);   const [ingresos, setIngresos] = useState([]);

  const [deudas, setDeudas] = useState([]);   const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: '', monto: '', tipo: 'Fijo' });

  const [objetivos, setObjetivos] = useState([]);   

  const [historialMensual, setHistorialMensual] = useState([]);   // Gastos fijos mensuales

  const [mostrarBienvenida, setMostrarBienvenida] = useState(true);   const [gastosFijos, setGastosFijos] = useState([]);

  "use client";

  // Cargar datos

  useEffect(() => {  import React, { useState, useRef, useEffect } from "react";

    try {  import {

      const datos = localStorage.getItem(STORAGE_KEY);    Plus,

      if (datos) {    Trash2,

        const parsed = JSON.parse(datos);    Download,

        setNombreUsuario(parsed.nombreUsuario || '');    Upload,

        setMesActual(parsed.mesActual || mesActual);    Save,

        setIngresos(Array.isArray(parsed.ingresos) ? parsed.ingresos : []);    Calendar,

        setGastosFijos(Array.isArray(parsed.gastosFijos) ? parsed.gastosFijos : []);    AlertCircle,

        setGastosVariables(Array.isArray(parsed.gastosVariables) ? parsed.gastosVariables : []);  } from "lucide-react";

        setDeudas(Array.isArray(parsed.deudas) ? parsed.deudas : []);

        setObjetivos(Array.isArray(parsed.objetivos) ? parsed.objetivos : []);  const STORAGE_KEY = "controlFinancieroEstado";

          const HISTORY_KEY = "controlFinancieroHistorial";

        if ([parsed.ingresos, parsed.gastosFijos, parsed.gastosVariables, parsed.deudas, parsed.objetivos]

            .some(l => Array.isArray(l) && l.length > 0)) {  export default function ControlFinanciero() {

          setMostrarBienvenida(false);    const fileInputRef = useRef(null);

        }

      }    const [nombreUsuario, setNombreUsuario] = useState("");

    const [mesActual, setMesActual] = useState(

      const hist = localStorage.getItem(HISTORY_KEY);      new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })

      if (hist) {    );

        const parsedH = JSON.parse(hist);

        if (Array.isArray(parsedH)) {    const [notificacion, setNotificacion] = useState({ show: false, mensaje: "", tipo: "success" });

          setHistorialMensual(parsedH);

        }    // Datos principales

      }    const [ingresos, setIngresos] = useState([]);

    } catch (e) {    const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: "", monto: "", tipo: "Fijo" });

      console.error('Error cargando datos:', e);

    }    const [gastosFijos, setGastosFijos] = useState([]);

  }, []);    const [gastosVariables, setGastosVariables] = useState([]);

    const [deudas, setDeudas] = useState([]);

  // Guardar datos    const [objetivos, setObjetivos] = useState([]);

  useEffect(() => {

    try {    const [historialMensual, setHistorialMensual] = useState([]);

      const estado = { 

        nombreUsuario,     const [mostrarBienvenida, setMostrarBienvenida] = useState(true);

        mesActual, 

        ingresos,     useEffect(() => {

        gastosFijos,       if (typeof window === "undefined") return;

        gastosVariables,       try {

        deudas,         const datos = localStorage.getItem(STORAGE_KEY);

        objetivos         if (datos) {

      };          const parsed = JSON.parse(datos);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));          setNombreUsuario(parsed.nombreUsuario || "");

    } catch (e) {          setMesActual(parsed.mesActual || mesActual);

      console.error('Error guardando estado:', e);          setIngresos(Array.isArray(parsed.ingresos) ? parsed.ingresos : []);

    }          setGastosFijos(Array.isArray(parsed.gastosFijos) ? parsed.gastosFijos : []);

  }, [nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos]);          setGastosVariables(Array.isArray(parsed.gastosVariables) ? parsed.gastosVariables : []);

          setDeudas(Array.isArray(parsed.deudas) ? parsed.deudas : []);

  // Guardar historial          setObjetivos(Array.isArray(parsed.objetivos) ? parsed.objetivos : []);

  useEffect(() => {          if (

    try {            [parsed.ingresos, parsed.gastosFijos, parsed.gastosVariables, parsed.deudas, parsed.objetivos].some(

      localStorage.setItem(HISTORY_KEY, JSON.stringify(historialMensual));              (l) => Array.isArray(l) && l.length > 0

    } catch (e) {            )

      console.error('Error guardando historial:', e);          ) {

    }            setMostrarBienvenida(false);

  }, [historialMensual]);          }

        }

  // Notificaciones

  const mostrarNotificacion = (mensaje, tipo = 'success') => {        const hist = localStorage.getItem(HISTORY_KEY);

    setNotificacion({ show: true, mensaje, tipo });        if (hist) {

    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 3000);          const parsedH = JSON.parse(hist);

  };          if (Array.isArray(parsedH)) setHistorialMensual(parsedH);

        }

  // Cálculos      } catch (e) {

  const totalIngresos = ingresos.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);        // eslint-disable-next-line no-console

  const totalGastosFijos = gastosFijos.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);        console.error("Error leyendo localStorage", e);

  const totalGastosVariables = gastosVariables.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);      }

  const totalGastos = totalGastosFijos + totalGastosVariables;    }, []);

  const saldoDisponible = totalIngresos - totalGastos;

    useEffect(() => {

  // CRUD Ingresos      if (typeof window === "undefined") return;

  const añadirIngreso = () => {      try {

    if (!nuevoIngreso.concepto || !nuevoIngreso.monto) {        const estado = { nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos };

      return mostrarNotificacion('Completa concepto y monto', 'error');        localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));

    }      } catch (e) {

    const monto = parseFloat(nuevoIngreso.monto);        // eslint-disable-next-line no-console

    if (Number.isNaN(monto) || monto <= 0) {        console.error("Error guardando estado", e);

      return mostrarNotificacion('Monto inválido', 'error');      }

    }    }, [nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos]);

    

    const nuevo = {     useEffect(() => {

      id: Date.now(),       if (typeof window === "undefined") return;

      concepto: nuevoIngreso.concepto,       try {

      monto,         localStorage.setItem(HISTORY_KEY, JSON.stringify(historialMensual));

      tipo: nuevoIngreso.tipo       } catch (e) {

    };        // eslint-disable-next-line no-console

            console.error("Error guardando historial", e);

    setIngresos(prev => [...prev, nuevo]);      }

    setNuevoIngreso({ concepto: '', monto: '', tipo: 'Fijo' });    }, [historialMensual]);

    setMostrarBienvenida(false);

    mostrarNotificacion('Ingreso añadido', 'success');    const mostrarNotificacion = (mensaje, tipo = "success") => {

  };      setNotificacion({ show: true, mensaje, tipo });

      setTimeout(() => setNotificacion({ show: false, mensaje: "", tipo: "success" }), 3000);

  const eliminarIngreso = (id) => {    };

    setIngresos(prev => prev.filter(i => i.id !== id));

    mostrarNotificacion('Ingreso eliminado', 'info');    // Totales sencillos

  };    const totalIngresos = ingresos.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);

    const totalGastosFijos = gastosFijos.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);

  // Historial    const totalGastosVariables = gastosVariables.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);

  const crearSnapshot = () => ({    const totalGastos = totalGastosFijos + totalGastosVariables;

    id: Date.now(),    const saldoDisponible = totalIngresos - totalGastos;

    mes: mesActual,

    fechaGuardado: new Date().toISOString(),    // CRUD - ingresos simple

    nombreUsuario,    const añadirIngreso = () => {

    ingresos: ingresos.map(i => ({ ...i })),      if (!nuevoIngreso.concepto || !nuevoIngreso.monto) return mostrarNotificacion("Completa concepto y monto", "error");

    gastosFijos: gastosFijos.map(g => ({ ...g })),      const monto = parseFloat(nuevoIngreso.monto);

    gastosVariables: gastosVariables.map(g => ({ ...g })),      if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion("Monto inválido", "error");

    deudas: deudas.map(d => ({ ...d })),      const nuevo = { id: Date.now(), concepto: nuevoIngreso.concepto, monto, tipo: nuevoIngreso.tipo };

    objetivos: objetivos.map(o => ({ ...o })),      setIngresos((p) => [...p, nuevo]);

    totales: { totalIngresos, totalGastos, saldoDisponible }      setNuevoIngreso({ concepto: "", monto: "", tipo: "Fijo" });

  });      setMostrarBienvenida(false);

      mostrarNotificacion("Ingreso añadido", "success");

  const guardarHistorial = () => {    };

    const snap = crearSnapshot();

    setHistorialMensual(prev => {    const eliminarIngreso = (id) => {

      const index = prev.findIndex(it =>       setIngresos((p) => p.filter((i) => i.id !== id));

        (it.mes || '').toLowerCase() === (snap.mes || '').toLowerCase()      mostrarNotificacion("Ingreso eliminado", "info");

      );    };

      

      if (index !== -1) {    // Export / Import

        const copy = [...prev];    const exportarDatos = () => {

        copy[index] = { ...snap, id: copy[index].id };      try {

        mostrarNotificacion('Historial actualizado', 'success');        const datos = { nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos, historialMensual, fechaExportacion: new Date().toISOString() };

        return copy;        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });

      }        const url = URL.createObjectURL(blob);

              const a = document.createElement("a");

      mostrarNotificacion('Historial guardado', 'success');        a.href = url;

      return [...prev, snap];        a.download = `control-financiero-${mesActual.replace(/\s/g, "-")}-${Date.now()}.json`;

    });        a.click();

  };        URL.revokeObjectURL(url);

        mostrarNotificacion("Datos exportados", "success");

  const restaurarHistorial = (id) => {      } catch (e) {

    const reg = historialMensual.find(h => h.id === id);        mostrarNotificacion("Error exportando datos", "error");

    if (!reg) return mostrarNotificacion('Registro no encontrado', 'error');      }

    };

    setNombreUsuario(reg.nombreUsuario || '');

    setMesActual(reg.mes || mesActual);    const importarDatos = (ev) => {

    setIngresos(Array.isArray(reg.ingresos) ? reg.ingresos : []);      const file = ev.target.files && ev.target.files[0];

    setGastosFijos(Array.isArray(reg.gastosFijos) ? reg.gastosFijos : []);      if (!file) return;

    setGastosVariables(Array.isArray(reg.gastosVariables) ? reg.gastosVariables : []);      const reader = new FileReader();

    setDeudas(Array.isArray(reg.deudas) ? reg.deudas : []);      reader.onload = (e) => {

    setObjetivos(Array.isArray(reg.objetivos) ? reg.objetivos : []);        try {

    setMostrarBienvenida(false);          const datos = JSON.parse(e.target.result);

    mostrarNotificacion(`Datos de ${reg.mes} restaurados`, 'success');          setNombreUsuario(datos.nombreUsuario || "");

  };          setMesActual(datos.mesActual || mesActual);

          setIngresos(Array.isArray(datos.ingresos) ? datos.ingresos : []);

  const eliminarHistorial = (id) => {          setGastosFijos(Array.isArray(datos.gastosFijos) ? datos.gastosFijos : []);

    setHistorialMensual(prev => prev.filter(h => h.id !== id));          setGastosVariables(Array.isArray(datos.gastosVariables) ? datos.gastosVariables : []);

    mostrarNotificacion('Registro eliminado', 'info');          setDeudas(Array.isArray(datos.deudas) ? datos.deudas : []);

  };          setObjetivos(Array.isArray(datos.objetivos) ? datos.objetivos : []);

          setHistorialMensual(Array.isArray(datos.historialMensual) ? datos.historialMensual : []);

  // Export/Import          mostrarNotificacion("Datos importados", "success");

  const exportarDatos = () => {          setMostrarBienvenida(false);

    try {        } catch (e) {

      const datos = {          mostrarNotificacion("Archivo inválido", "error");

        nombreUsuario,        }

        mesActual,      };

        ingresos,      reader.readAsText(file);

        gastosFijos,    };

        gastosVariables,

        deudas,    // Historial mensual básico

        objetivos,    const crearSnapshot = () => ({

        historialMensual,      id: Date.now(),

        fechaExportacion: new Date().toISOString()      mes: mesActual,

      };      fechaGuardado: new Date().toISOString(),

            nombreUsuario,

      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });      ingresos: ingresos.map((i) => ({ ...i })),

      const url = URL.createObjectURL(blob);      gastosFijos: gastosFijos.map((g) => ({ ...g })),

      const a = document.createElement('a');      gastosVariables: gastosVariables.map((g) => ({ ...g })),

      a.href = url;      deudas: deudas.map((d) => ({ ...d })),

      a.download = `control-financiero-${mesActual.replace(/\s/g, '-')}-${Date.now()}.json`;      objetivos: objetivos.map((o) => ({ ...o })),

      a.click();      totales: { totalIngresos, totalGastos, saldoDisponible },

      URL.revokeObjectURL(url);    });

      mostrarNotificacion('Datos exportados', 'success');

    } catch (e) {    const guardarHistorial = () => {

      mostrarNotificacion('Error exportando datos', 'error');      const snap = crearSnapshot();

    }      setHistorialMensual((p) => {

  };        const index = p.findIndex((it) => (it.mes || "").toLowerCase() === (snap.mes || "").toLowerCase());

        if (index !== -1) {

  const importarDatos = (ev) => {          const copy = [...p];

    const file = ev.target.files && ev.target.files[0];          copy[index] = { ...snap, id: copy[index].id };

    if (!file) return;          mostrarNotificacion("Historial actualizado", "success");

          return copy;

    const reader = new FileReader();        }

    reader.onload = (e) => {        mostrarNotificacion("Historial guardado", "success");

      try {        return [...p, snap];

        const datos = JSON.parse(e.target.result);      });

        setNombreUsuario(datos.nombreUsuario || '');    };

        setMesActual(datos.mesActual || mesActual);

        setIngresos(Array.isArray(datos.ingresos) ? datos.ingresos : []);    const restaurarHistorial = (id) => {

        setGastosFijos(Array.isArray(datos.gastosFijos) ? datos.gastosFijos : []);      const reg = historialMensual.find((h) => h.id === id);

        setGastosVariables(Array.isArray(datos.gastosVariables) ? datos.gastosVariables : []);      if (!reg) return mostrarNotificacion("Registro no encontrado", "error");

        setDeudas(Array.isArray(datos.deudas) ? datos.deudas : []);      setNombreUsuario(reg.nombreUsuario || "");

        setObjetivos(Array.isArray(datos.objetivos) ? datos.objetivos : []);      setMesActual(reg.mes || mesActual);

        setHistorialMensual(Array.isArray(datos.historialMensual) ? datos.historialMensual : []);      setIngresos(Array.isArray(reg.ingresos) ? reg.ingresos : []);

        mostrarNotificacion('Datos importados', 'success');      setGastosFijos(Array.isArray(reg.gastosFijos) ? reg.gastosFijos : []);

        setMostrarBienvenida(false);      setGastosVariables(Array.isArray(reg.gastosVariables) ? reg.gastosVariables : []);

      } catch (e) {      setDeudas(Array.isArray(reg.deudas) ? reg.deudas : []);

        mostrarNotificacion('Error importando datos', 'error');      setObjetivos(Array.isArray(reg.objetivos) ? reg.objetivos : []);

      }      setMostrarBienvenida(false);

    };      mostrarNotificacion(`Datos de ${reg.mes} restaurados`, "success");

    reader.readAsText(file);    };

  };

    const eliminarHistorial = (id) => {

  return (      setHistorialMensual((p) => p.filter((h) => h.id !== id));

    <div className="min-h-screen p-4 bg-slate-50">      mostrarNotificacion("Registro eliminado", "info");

      {notificacion.show && (    };

        <div className={`fixed top-4 right-4 p-3 rounded shadow ${

          notificacion.tipo === 'success' ? 'bg-green-500' :     return (

          notificacion.tipo === 'error' ? 'bg-red-500' :       <div className="min-h-screen p-4 bg-slate-50">

          'bg-blue-500'        {notificacion.show && (

        }`}>          <div className={`fixed top-4 right-4 p-3 rounded shadow ${notificacion.tipo === "success" ? "bg-green-500" : notificacion.tipo === "error" ? "bg-red-500" : "bg-blue-500"}`}>

          <span className="text-white">{notificacion.mensaje}</span>            <span className="text-white">{notificacion.mensaje}</span>

        </div>          </div>

      )}        )}



      <header className="max-w-4xl mx-auto">        <header className="max-w-4xl mx-auto">

        <h1 className="text-2xl font-bold mb-2">Control Financiero</h1>          <h1 className="text-2xl font-bold mb-2">Control Financiero</h1>

        <p className="text-sm text-gray-600 mb-4">          <p className="text-sm text-gray-600 mb-4">Usuario: <strong>{nombreUsuario || 'Anónimo'}</strong> — Mes: <strong>{mesActual}</strong></p>

          Usuario: <strong>{nombreUsuario || 'Anónimo'}</strong> —         </header>

          Mes: <strong>{mesActual}</strong>

        </p>        <main className="max-w-4xl mx-auto space-y-6">

      </header>          <section className="bg-white p-4 rounded shadow">

            <h2 className="font-semibold mb-2">Añadir ingreso</h2>

      <main className="max-w-4xl mx-auto space-y-6">            <div className="flex gap-2">

        <section className="bg-white p-4 rounded shadow">              <input aria-label="concepto" placeholder="Concepto" value={nuevoIngreso.concepto} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, concepto: e.target.value })} className="border p-2 rounded flex-1" />

          <h2 className="font-semibold mb-2">Añadir ingreso</h2>              <input aria-label="monto" placeholder="Monto" value={nuevoIngreso.monto} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, monto: e.target.value })} className="border p-2 rounded w-32" />

          <div className="flex gap-2">              <button onClick={añadirIngreso} className="bg-blue-600 text-white px-3 rounded inline-flex items-center gap-2"><Plus size={16} /> Añadir</button>

            <input            </div>

              aria-label="concepto"          </section>

              placeholder="Concepto"

              value={nuevoIngreso.concepto}          <section className="bg-white p-4 rounded shadow">

              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, concepto: e.target.value })}            <h2 className="font-semibold mb-2">Ingresos</h2>

              className="border p-2 rounded flex-1"            {ingresos.length === 0 ? (

            />              <p className="text-sm text-gray-500">No hay ingresos registrados.</p>

            <input            ) : (

              aria-label="monto"              <ul className="space-y-2">

              placeholder="Monto"                {ingresos.map((i) => (

              value={nuevoIngreso.monto}                  <li key={i.id} className="flex justify-between items-center border p-2 rounded">

              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, monto: e.target.value })}                    <div>

              className="border p-2 rounded w-32"                      <div className="font-medium">{i.concepto}</div>

            />                      <div className="text-sm text-gray-500">{i.tipo}</div>

            <button                    </div>

              onClick={añadirIngreso}                    <div className="flex items-center gap-2">

              className="bg-blue-600 text-white px-3 rounded inline-flex items-center gap-2"                      <div className="font-bold">{(i.monto || 0).toFixed(2)} €</div>

            >                      <button onClick={() => eliminarIngreso(i.id)} className="text-red-600"><Trash2 size={16} /></button>

              <Plus size={16} /> Añadir                    </div>

            </button>                  </li>

          </div>                ))}

        </section>              </ul>

            )}

        <section className="bg-white p-4 rounded shadow">            <div className="mt-3 text-sm text-gray-700">Total ingresos: <strong>{totalIngresos.toFixed(2)} €</strong></div>

          <h2 className="font-semibold mb-2">Ingresos</h2>          </section>

          {ingresos.length === 0 ? (

            <p className="text-sm text-gray-500">No hay ingresos registrados.</p>          <section className="bg-white p-4 rounded shadow">

          ) : (            <h2 className="font-semibold mb-2">Historial mensual</h2>

            <ul className="space-y-2">            <div className="flex gap-2">

              {ingresos.map((i) => (              <button onClick={guardarHistorial} className="bg-purple-600 text-white px-3 py-2 rounded inline-flex items-center gap-2"><Save size={16} /> Guardar mes</button>

                <li key={i.id} className="flex justify-between items-center border p-2 rounded">              <button onClick={exportarDatos} className="bg-green-600 text-white px-3 py-2 rounded inline-flex items-center gap-2"><Download size={16} /> Exportar</button>

                  <div>              <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="bg-gray-200 px-3 py-2 rounded inline-flex items-center gap-2"><Upload size={16} /> Importar</button>

                    <div className="font-medium">{i.concepto}</div>              <input ref={fileInputRef} type="file" accept="application/json" onChange={importarDatos} className="hidden" />

                    <div className="text-sm text-gray-500">{i.tipo}</div>            </div>

                  </div>

                  <div className="flex items-center gap-2">            {historialMensual.length === 0 ? (

                    <div className="font-bold">{(i.monto || 0).toFixed(2)} €</div>              <p className="text-sm text-gray-500 mt-3">Aún no hay registros. Guarda el mes actual para empezar.</p>

                    <button onClick={() => eliminarIngreso(i.id)} className="text-red-600">            ) : (

                      <Trash2 size={16} />              <ul className="mt-3 space-y-2">

                    </button>                {[...historialMensual].slice().reverse().map((h) => (

                  </div>                  <li key={h.id} className="border rounded p-2 flex justify-between items-center">

                </li>                    <div>

              ))}                      <div className="font-medium">{h.mes}</div>

            </ul>                      <div className="text-xs text-gray-500">Guardado: {new Date(h.fechaGuardado).toLocaleString()}</div>

          )}                    </div>

          <div className="mt-3 text-sm text-gray-700">                    <div className="flex gap-2">

            Total ingresos: <strong>{totalIngresos.toFixed(2)} €</strong>                      <button onClick={() => restaurarHistorial(h.id)} className="px-2 py-1 border rounded text-sm">Restaurar</button>

          </div>                      <button onClick={() => eliminarHistorial(h.id)} className="px-2 py-1 border rounded text-sm text-red-600">Eliminar</button>

        </section>                    </div>

                  </li>

        <section className="bg-white p-4 rounded shadow">                ))}

          <h2 className="font-semibold mb-2">Historial mensual</h2>              </ul>

          <div className="flex gap-2">            )}

            <button          </section>

              onClick={guardarHistorial}

              className="bg-purple-600 text-white px-3 py-2 rounded inline-flex items-center gap-2"          <section className="bg-white p-4 rounded shadow">

            >            <h2 className="font-semibold mb-2">Resumen</h2>

              <Save size={16} /> Guardar mes            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            </button>              <div className="p-3 bg-green-50 rounded">Ingresos: <div className="font-bold">{totalIngresos.toFixed(2)} €</div></div>

            <button              <div className="p-3 bg-red-50 rounded">Gastos: <div className="font-bold">{totalGastos.toFixed(2)} €</div></div>

              onClick={exportarDatos}              <div className="p-3 bg-blue-50 rounded">Balance: <div className="font-bold">{saldoDisponible.toFixed(2)} €</div></div>

              className="bg-green-600 text-white px-3 py-2 rounded inline-flex items-center gap-2"            </div>

            >          </section>

              <Download size={16} /> Exportar        </main>

            </button>      </div>

            <button    );

              onClick={() => fileInputRef.current?.click()}  }

              className="bg-gray-200 px-3 py-2 rounded inline-flex items-center gap-2"       nombreUsuario,

            >       mesActual,

              <Upload size={16} /> Importar       ingresos,

            </button>       gastosFijos,

            <input       gastosVariables,

              ref={fileInputRef}       deudas,

              type="file"       objetivos,

              accept="application/json"+      historialMensual,

              onChange={importarDatos}       totales: {

              className="hidden"         totalIngresos,

            />         totalGastosFijos,

          </div>         totalGastosVariables,

         totalGastos,

          {historialMensual.length === 0 ? (         saldoDisponible,

            <p className="text-sm text-gray-500 mt-3">         totalDeudas

              Aún no hay registros. Guarda el mes actual para empezar.       },

            </p>       fechaExportacion: new Date().toISOString()

          ) : (     };

            <ul className="mt-3 space-y-2">     

              {[...historialMensual].reverse().map((h) => (     const dataStr = JSON.stringify(datos, null, 2);

                <li key={h.id} className="border rounded p-2 flex justify-between items-center">     const dataBlob = new Blob([dataStr], { type: 'application/json' });

                  <div>     const url = URL.createObjectURL(dataBlob);

                    <div className="font-medium">{h.mes}</div>     const link = document.createElement('a');

                    <div className="text-xs text-gray-500">     link.href = url;

                      Guardado: {new Date(h.fechaGuardado).toLocaleString()}     const nombreArchivo = `control-financiero-${mesActual.replace(/\s/g, '-')}-${Date.now()}.json`;

                    </div>     link.download = nombreArchivo;

                  </div>     link.click();

                  <div className="flex gap-2">     mostrarNotificacion('Datos exportados correctamente', 'success');

                    <button   };

                      onClick={() => restaurarHistorial(h.id)}   

                      className="px-2 py-1 border rounded text-sm"   // Importar datos

                    >   const importarDatos = (event) => {

                      Restaurar     const file = event.target.files[0];

                    </button>     if (file) {

                    <button       const reader = new FileReader();

                      onClick={() => eliminarHistorial(h.id)}       reader.onload = (e) => {

                      className="px-2 py-1 border rounded text-sm text-red-600"         try {

                    >           const datos = JSON.parse(e.target.result);

                      Eliminar           setNombreUsuario(datos.nombreUsuario || '');

                    </button>           setMesActual(datos.mesActual || '');

                  </div>           setIngresos(datos.ingresos || []);

                </li>           setGastosFijos(datos.gastosFijos || []);

              ))}           setGastosVariables(datos.gastosVariables || []);

            </ul>           setDeudas(datos.deudas || []);

          )}           setObjetivos(datos.objetivos || []);

        </section>+          setHistorialMensual(Array.isArray(datos.historialMensual) ? datos.historialMensual : []);

           mostrarNotificacion('Datos importados correctamente', 'success');

        <section className="bg-white p-4 rounded shadow">           setMostrarBienvenida(false);

          <h2 className="font-semibold mb-2">Resumen</h2>         } catch (error) {

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">           mostrarNotificacion('Error al importar. Verifica que sea un archivo válido', 'error');

            <div className="p-3 bg-green-50 rounded">         }

              Ingresos: <div className="font-bold">{totalIngresos.toFixed(2)} €</div>       };

            </div>       reader.readAsText(file);

            <div className="p-3 bg-red-50 rounded">     }

              Gastos: <div className="font-bold">{totalGastos.toFixed(2)} €</div>   };

            </div>   

            <div className="p-3 bg-blue-50 rounded">   // Auto-hide bienvenida si hay datos

              Balance: <div className="font-bold">{saldoDisponible.toFixed(2)} €</div>   useEffect(() => {

            </div>     if (ingresos.length > 0 || gastosFijos.length > 0) {

          </div>       setMostrarBienvenida(false);

        </section>     }

      </main>   }, [ingresos, gastosFijos]);

    </div> 

  );   return (

}     <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 sm:p-4">
       {/* Notificaciones */}
       {notificacion.show && (
         <div className={`fixed top-4 right-4 z-50 animate-pulse transition-all duration-300 ${
           notificacion.tipo === 'success' ? 'bg-green-500' :
           notificacion.tipo === 'error' ? 'bg-red-500' :
           'bg-blue-500'
diff --git a/Index b/components/ControlFinanciero.jsx
index 8bdd027c6eb345b92a071edb3c831caf9d2f66be..2e63bd44fdf0b4928b46c68ff2de640f6535294f 100644
--- a/Index
+++ b/components/ControlFinanciero.jsx
@@ -605,50 +779,128 @@ export default function ControlFinanciero() {
                           <div className="w-full bg-gray-200 rounded-full h-2">
                             <div
                               className="h-2 rounded-full transition-all duration-500"
                               style={{ 
                                 width: `${Math.min(progreso, 100)}%`, 
                                 backgroundColor: obj.color 
                               }}
                             />
                           </div>
                         </div>
                       );
                     })}
                     {objetivos.length > 3 && (
                       <button 
                         onClick={() => setVistaActiva('objetivos')}
                         className="text-purple-600 hover:underline text-sm"
                       >
                         Ver todos ({objetivos.length}) →
                       </button>
                     )}
                   </div>
                 )}
               </div>
             </div>
 
+            {/* Historial mensual */}
+            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 mt-6">
+              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
+                <div>
+                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
+                    <Calendar className="text-purple-600" size={20} />
+                    Historial mensual
+                  </h3>
+                  <p className="text-sm text-gray-500">Guarda un resumen al cerrar cada mes y compáralo a futuro.</p>
+                </div>
+                <button
+                  onClick={guardarHistorialMensual}
+                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl font-semibold transition-all transform hover:scale-105"
+                >
+                  <Save size={18} /> Guardar mes actual
+                </button>
+              </div>
+
+              {historialOrdenado.length === 0 ? (
+                <div className="text-center py-10 text-gray-500">
+                  <Calendar size={48} className="mx-auto mb-4 opacity-30" />
+                  <p>No hay registros guardados todavía.</p>
+                  <p className="text-sm mt-2">Guarda el mes actual para empezar tu historial anual.</p>
+                </div>
+              ) : (
+                <div className="mt-6 space-y-4">
+                  {historialOrdenado.map(registro => {
+                    const totales = registro.totales || {};
+                    return (
+                      <div key={registro.id} className="border border-gray-200 rounded-2xl p-4 bg-white/90 hover:shadow-lg transition-all">
+                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
+                          <div>
+                            <p className="text-xs uppercase tracking-wide text-gray-500">Guardado el {formatearFecha(registro.fechaGuardado)}</p>
+                            <h4 className="text-2xl font-bold text-gray-800 capitalize">{registro.mes}</h4>
+                          </div>
+                          <div className="flex items-center gap-2">
+                            <button
+                              onClick={() => restaurarHistorialMes(registro.id)}
+                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
+                            >
+                              <Upload size={16} /> Restaurar
+                            </button>
+                            <button
+                              onClick={() => eliminarHistorialMes(registro.id)}
+                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
+                            >
+                              <Trash2 size={16} /> Eliminar
+                            </button>
+                          </div>
+                        </div>
+
+                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
+                          <div className="bg-green-50 rounded-xl p-3">
+                            <p className="text-xs text-green-700 font-semibold">Ingresos</p>
+                            <p className="text-xl font-bold text-green-600">{(totales.totalIngresos || 0).toFixed(2)} €</p>
+                          </div>
+                          <div className="bg-red-50 rounded-xl p-3">
+                            <p className="text-xs text-red-700 font-semibold">Gastos</p>
+                            <p className="text-xl font-bold text-red-600">{(totales.totalGastos || 0).toFixed(2)} €</p>
+                          </div>
+                          <div className="bg-blue-50 rounded-xl p-3">
+                            <p className="text-xs text-blue-700 font-semibold">Balance</p>
+                            <p className={`text-xl font-bold ${ (totales.saldoDisponible || 0) >= 0 ? 'text-blue-600' : 'text-orange-600' }`}>
+                              {(totales.saldoDisponible || 0).toFixed(2)} €
+                            </p>
+                          </div>
+                          <div className="bg-orange-50 rounded-xl p-3">
+                            <p className="text-xs text-orange-700 font-semibold">Deudas</p>
+                            <p className="text-xl font-bold text-orange-600">{(totales.totalDeudas || 0).toFixed(2)} €</p>
+                          </div>
+                        </div>
+                      </div>
+                    );
+                  })}
+                </div>
+              )}
+            </div>
+
             {/* Tips financieros */}
             <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 mt-6 text-white">
               <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                 <AlertCircle size={24} />
                 Consejos Financieros
               </h3>
               <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                   <div className="text-2xl mb-2">💡</div>
                   <p className="text-sm">
                     {tasaAhorro < 10 ? 
                       'Intenta ahorrar al menos el 10% de tus ingresos' :
                       `¡Excelente! Estás ahorrando el ${tasaAhorro.toFixed(0)}% de tus ingresos`
                     }
                   </p>
                 </div>
                 <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                   <div className="text-2xl mb-2">📊</div>
                   <p className="text-sm">
                     {gastosVariables.length < 5 ?
                       'Registra todos tus gastos para tener un control real' :
                       'Buen trabajo registrando tus gastos diarios'
                     }
                   </p>
                 </div>
