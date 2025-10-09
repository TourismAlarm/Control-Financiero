diff --git a/Index b/components/ControlFinanciero.jsx
index 8bdd027c6eb345b92a071edb3c831caf9d2f66be..2e63bd44fdf0b4928b46c68ff2de640f6535294f 100644
--- a/Index
+++ b/components/ControlFinanciero.jsx
@@ -1,107 +1,279 @@
-import React, { useState, useRef, useEffect } from 'react';
+'use client';
+
+import { useState, useRef, useEffect } from 'react';
 import { Plus, Trash2, Download, Upload, TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, BarChart3, Target, Edit2, Save, X, Calendar, CreditCard, ShoppingCart, Home, PiggyBank, AlertCircle, CheckCircle } from 'lucide-react';
 import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
 
+const STORAGE_KEY = 'controlFinancieroEstado';
+const HISTORY_KEY = 'controlFinancieroHistorial';
+
 export default function ControlFinanciero() {
   const fileInputRef = useRef(null);
   
   // Estado inicial
   const [nombreUsuario, setNombreUsuario] = useState('');
   const [mesActual, setMesActual] = useState(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
   
   // Estado para notificaciones
   const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });
   
   // Ingresos (múltiples fuentes)
   const [ingresos, setIngresos] = useState([]);
   const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: '', monto: '', tipo: 'Fijo' });
   
   // Gastos fijos mensuales
   const [gastosFijos, setGastosFijos] = useState([]);
   const [nuevoGastoFijo, setNuevoGastoFijo] = useState({ concepto: '', monto: '', categoria: 'Vivienda' });
   
   // Gastos variables (día a día)
   const [gastosVariables, setGastosVariables] = useState([]);
   const [nuevoGastoVariable, setNuevoGastoVariable] = useState({ 
     fecha: new Date().toISOString().split('T')[0], 
     concepto: '', 
     monto: '', 
     categoria: 'Alimentación' 
   });
   
   // Deudas
   const [deudas, setDeudas] = useState([]);
   const [nuevaDeuda, setNuevaDeuda] = useState({ 
     nombre: '', 
     saldoInicial: '', 
     saldoActual: '', 
     cuotaMensual: '', 
     interes: '', 
     fechaFin: '' 
   });
   
   // Objetivos de ahorro
   const [objetivos, setObjetivos] = useState([]);
   const [nuevoObjetivo, setNuevoObjetivo] = useState({ nombre: '', meta: '', actual: '' });
-  
+
+  const [historialMensual, setHistorialMensual] = useState([]);
+
   // Vista activa
   const [vistaActiva, setVistaActiva] = useState('inicio');
   const [mostrarBienvenida, setMostrarBienvenida] = useState(true);
   
   // Categorías predefinidas con iconos y colores
   const categorias = [
     { nombre: 'Alimentación', color: '#10b981', icono: '🍽️' },
     { nombre: 'Transporte', color: '#3b82f6', icono: '🚗' },
     { nombre: 'Vivienda', color: '#8b5cf6', icono: '🏠' },
     { nombre: 'Servicios', color: '#f59e0b', icono: '📱' },
     { nombre: 'Ocio', color: '#ec4899', icono: '🎮' },
     { nombre: 'Salud', color: '#ef4444', icono: '💊' },
     { nombre: 'Educación', color: '#14b8a6', icono: '📚' },
     { nombre: 'Ropa', color: '#f97316', icono: '👕' },
     { nombre: 'Deudas', color: '#dc2626', icono: '💳' },
     { nombre: 'Otros', color: '#6b7280', icono: '📦' }
   ];
-  
+
   const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
-  
+
+  useEffect(() => {
+    if (typeof window === 'undefined') {
+      return;
+    }
+
+    try {
+      const datosGuardados = localStorage.getItem(STORAGE_KEY);
+      if (datosGuardados) {
+        const parsed = JSON.parse(datosGuardados);
+        if (parsed && typeof parsed === 'object') {
+          setNombreUsuario(parsed.nombreUsuario || '');
+          setMesActual(parsed.mesActual || new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
+          setIngresos(Array.isArray(parsed.ingresos) ? parsed.ingresos : []);
+          setGastosFijos(Array.isArray(parsed.gastosFijos) ? parsed.gastosFijos : []);
+          setGastosVariables(Array.isArray(parsed.gastosVariables) ? parsed.gastosVariables : []);
+          setDeudas(Array.isArray(parsed.deudas) ? parsed.deudas : []);
+          setObjetivos(Array.isArray(parsed.objetivos) ? parsed.objetivos : []);
+
+          if ([parsed.ingresos, parsed.gastosFijos, parsed.gastosVariables, parsed.deudas, parsed.objetivos]
+            .some(lista => Array.isArray(lista) && lista.length > 0)) {
+            setMostrarBienvenida(false);
+          }
+        }
+      }
+
+      const historialGuardado = localStorage.getItem(HISTORY_KEY);
+      if (historialGuardado) {
+        const parsedHistorial = JSON.parse(historialGuardado);
+        if (Array.isArray(parsedHistorial)) {
+          setHistorialMensual(parsedHistorial);
+        }
+      }
+    } catch (error) {
+      console.error('Error al recuperar datos almacenados', error);
+    }
+  }, []);
+
+  useEffect(() => {
+    if (typeof window === 'undefined') {
+      return;
+    }
+
+    try {
+      const estadoActual = {
+        nombreUsuario,
+        mesActual,
+        ingresos,
+        gastosFijos,
+        gastosVariables,
+        deudas,
+        objetivos
+      };
+      localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoActual));
+    } catch (error) {
+      console.error('Error al guardar el estado actual', error);
+    }
+  }, [nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos]);
+
+  useEffect(() => {
+    if (typeof window === 'undefined') {
+      return;
+    }
+
+    try {
+      localStorage.setItem(HISTORY_KEY, JSON.stringify(historialMensual));
+    } catch (error) {
+      console.error('Error al guardar el historial mensual', error);
+    }
+  }, [historialMensual]);
+
   // Función para mostrar notificaciones
   const mostrarNotificacion = (mensaje, tipo = 'success') => {
     setNotificacion({ show: true, mensaje, tipo });
     setTimeout(() => {
       setNotificacion({ show: false, mensaje: '', tipo: 'success' });
     }, 3000);
   };
   
   // Calcular totales
   const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);
   const totalGastosFijos = gastosFijos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
   const totalGastosVariables = gastosVariables.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
   const totalGastos = totalGastosFijos + totalGastosVariables;
   const saldoDisponible = totalIngresos - totalGastos;
   const totalDeudas = deudas.reduce((sum, d) => sum + parseFloat(d.saldoActual || 0), 0);
   const tasaAhorro = totalIngresos > 0 ? ((saldoDisponible / totalIngresos) * 100) : 0;
+
+  const formatearFecha = (fechaISO) => {
+    if (!fechaISO) return '-';
+    const fecha = new Date(fechaISO);
+    if (Number.isNaN(fecha.getTime())) return '-';
+    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
+  };
+
+  const historialOrdenado = [...historialMensual].sort((a, b) => {
+    const fechaA = new Date(a.fechaGuardado || 0).getTime();
+    const fechaB = new Date(b.fechaGuardado || 0).getTime();
+    return fechaB - fechaA;
+  });
+
+  const crearSnapshotMensual = () => {
+    const clonarLista = (lista) => lista.map(item => ({ ...item }));
+    const mesParaGuardar = (mesActual && mesActual.trim()) ||
+      new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
+
+    return {
+      id: Date.now(),
+      mes: mesParaGuardar,
+      fechaGuardado: new Date().toISOString(),
+      nombreUsuario,
+      ingresos: clonarLista(ingresos),
+      gastosFijos: clonarLista(gastosFijos),
+      gastosVariables: clonarLista(gastosVariables),
+      deudas: clonarLista(deudas),
+      objetivos: clonarLista(objetivos),
+      totales: {
+        totalIngresos,
+        totalGastosFijos,
+        totalGastosVariables,
+        totalGastos,
+        saldoDisponible,
+        totalDeudas
+      }
+    };
+  };
+
+  const guardarHistorialMensual = () => {
+    const snapshot = crearSnapshotMensual();
+    const mesNormalizado = snapshot.mes.toLowerCase();
+    let mensaje = 'Historial mensual guardado';
+
+    setHistorialMensual(prev => {
+      const indiceExistente = prev.findIndex(item => (item.mes || '').toLowerCase() === mesNormalizado);
+
+      if (indiceExistente !== -1) {
+        mensaje = 'Historial del mes actualizado';
+        const actualizado = [...prev];
+        actualizado[indiceExistente] = {
+          ...snapshot,
+          id: actualizado[indiceExistente].id,
+          fechaGuardado: snapshot.fechaGuardado
+        };
+        return actualizado;
+      }
+
+      return [...prev, snapshot];
+    });
+
+    mostrarNotificacion(mensaje, 'success');
+  };
+
+  const restaurarHistorialMes = (id) => {
+    const registro = historialMensual.find(item => item.id === id);
+    if (!registro) {
+      mostrarNotificacion('No se encontró el registro seleccionado', 'error');
+      return;
+    }
+
+    setNombreUsuario(registro.nombreUsuario || '');
+    setMesActual(registro.mes || new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
+    setIngresos((registro.ingresos || []).map(item => ({ ...item })));
+    setGastosFijos((registro.gastosFijos || []).map(item => ({ ...item })));
+    setGastosVariables((registro.gastosVariables || []).map(item => ({ ...item })));
+    setDeudas((registro.deudas || []).map(item => ({ ...item })));
+    setObjetivos((registro.objetivos || []).map(item => ({ ...item })));
+    setMostrarBienvenida(false);
+
+    mostrarNotificacion(`Datos de ${registro.mes} restaurados`, 'success');
+  };
+
+  const eliminarHistorialMes = (id) => {
+    let eliminado = false;
+    setHistorialMensual(prev => {
+      eliminado = prev.some(item => item.id === id);
+      return prev.filter(item => item.id !== id);
+    });
+
+    if (eliminado) {
+      mostrarNotificacion('Registro eliminado del historial', 'info');
+    }
+  };
   
   // Funciones CRUD - Ingresos
   const añadirIngreso = () => {
     if (!nuevoIngreso.concepto || !nuevoIngreso.monto) {
       mostrarNotificacion('Por favor completa todos los campos', 'error');
       return;
     }
     if (parseFloat(nuevoIngreso.monto) <= 0) {
       mostrarNotificacion('El monto debe ser mayor a 0', 'error');
       return;
     }
     
     setIngresos([...ingresos, { 
       id: Date.now(), 
       concepto: nuevoIngreso.concepto, 
       monto: parseFloat(nuevoIngreso.monto),
       tipo: nuevoIngreso.tipo
     }]);
     setNuevoIngreso({ concepto: '', monto: '', tipo: 'Fijo' });
     mostrarNotificacion('Ingreso añadido correctamente', 'success');
   };
   
   const eliminarIngreso = (id) => {
     setIngresos(ingresos.filter(i => i.id !== id));
     mostrarNotificacion('Ingreso eliminado', 'info');
diff --git a/Index b/components/ControlFinanciero.jsx
index 8bdd027c6eb345b92a071edb3c831caf9d2f66be..2e63bd44fdf0b4928b46c68ff2de640f6535294f 100644
--- a/Index
+++ b/components/ControlFinanciero.jsx
@@ -265,87 +437,89 @@ export default function ControlFinanciero() {
     for (let i = 6; i >= 0; i--) {
       const fecha = new Date(hoy);
       fecha.setDate(fecha.getDate() - i);
       const fechaStr = fecha.toISOString().split('T')[0];
       const gastosDia = gastosVariables
         .filter(g => g.fecha === fechaStr)
         .reduce((sum, g) => sum + g.monto, 0);
       dias.push({
         dia: fecha.toLocaleDateString('es-ES', { weekday: 'short' }),
         gastos: gastosDia
       });
     }
     return dias;
   };
   
   // Exportar datos
   const exportarDatos = () => {
     const datos = {
       nombreUsuario,
       mesActual,
       ingresos,
       gastosFijos,
       gastosVariables,
       deudas,
       objetivos,
+      historialMensual,
       totales: {
         totalIngresos,
         totalGastosFijos,
         totalGastosVariables,
         totalGastos,
         saldoDisponible,
         totalDeudas
       },
       fechaExportacion: new Date().toISOString()
     };
     
     const dataStr = JSON.stringify(datos, null, 2);
     const dataBlob = new Blob([dataStr], { type: 'application/json' });
     const url = URL.createObjectURL(dataBlob);
     const link = document.createElement('a');
     link.href = url;
     const nombreArchivo = `control-financiero-${mesActual.replace(/\s/g, '-')}-${Date.now()}.json`;
     link.download = nombreArchivo;
     link.click();
     mostrarNotificacion('Datos exportados correctamente', 'success');
   };
   
   // Importar datos
   const importarDatos = (event) => {
     const file = event.target.files[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const datos = JSON.parse(e.target.result);
           setNombreUsuario(datos.nombreUsuario || '');
           setMesActual(datos.mesActual || '');
           setIngresos(datos.ingresos || []);
           setGastosFijos(datos.gastosFijos || []);
           setGastosVariables(datos.gastosVariables || []);
           setDeudas(datos.deudas || []);
           setObjetivos(datos.objetivos || []);
+          setHistorialMensual(Array.isArray(datos.historialMensual) ? datos.historialMensual : []);
           mostrarNotificacion('Datos importados correctamente', 'success');
           setMostrarBienvenida(false);
         } catch (error) {
           mostrarNotificacion('Error al importar. Verifica que sea un archivo válido', 'error');
         }
       };
       reader.readAsText(file);
     }
   };
   
   // Auto-hide bienvenida si hay datos
   useEffect(() => {
     if (ingresos.length > 0 || gastosFijos.length > 0) {
       setMostrarBienvenida(false);
     }
   }, [ingresos, gastosFijos]);
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 sm:p-4">
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
