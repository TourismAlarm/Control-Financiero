'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, Save, Calendar, AlertCircle, Moon, Sun, LogOut, CreditCard, Home, TrendingUp, DollarSign, ShoppingCart, Target, BarChart3 } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { createClient } from '@/lib/supabase';
import LoanManager from './loans/LoanManager';

const STORAGE_KEY = 'controlFinancieroEstado';
const HISTORY_KEY = 'controlFinancieroHistorial';
const THEME_KEY = 'controlFinancieroTheme';

export default function ControlFinanciero() {
  console.log('🟢 COMPONENTE RENDERIZADO - ControlFinanciero montado')

  const { data: session } = useSession();
  const fileInputRef = useRef(null);

  // Estado de navegación
  const [vistaActiva, setVistaActiva] = useState('inicio');

  // Estado inicial
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [mesActual, setMesActual] = useState(
    new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  // Estado para notificaciones
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

  // Estado para modo oscuro
  const [darkMode, setDarkMode] = useState(false);

  // Datos principales
  const [ingresos, setIngresos] = useState([]);
  const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: '', monto: '', tipo: 'Fijo', fecha: new Date().toISOString().split('T')[0] });

  const [gastosFijos, setGastosFijos] = useState([]);
  const [nuevoGastoFijo, setNuevoGastoFijo] = useState({ concepto: '', monto: '' });

  const [gastosVariables, setGastosVariables] = useState([]);
  const [nuevoGastoVariable, setNuevoGastoVariable] = useState({
    concepto: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Alimentación'
  });

  // Categorías predefinidas para gastos variables
  const CATEGORIAS_GASTOS = [
    'Alimentación',
    'Transporte',
    'Ocio',
    'Salud',
    'Educación',
    'Hogar',
    'Ropa',
    'Tecnología',
    'Otros'
  ];

  const [deudas, setDeudas] = useState([]);
  const [nuevaDeuda, setNuevaDeuda] = useState({
    nombre: '',
    montoTotal: '',
    plazoMeses: '',
    cuotaMensual: '',
    pagadoEsteMes: 0,
    totalPagado: 0
  });

  const [cuentasAhorro, setCuentasAhorro] = useState([]);
  const [nuevaCuentaAhorro, setNuevaCuentaAhorro] = useState({ nombre: '', saldo: '' });

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
        setCuentasAhorro(Array.isArray(parsed.cuentasAhorro) ? parsed.cuentasAhorro : Array.isArray(parsed.objetivos) ? parsed.objetivos : []);

        if (
          [parsed.ingresos, parsed.gastosFijos, parsed.gastosVariables, parsed.deudas, parsed.cuentasAhorro, parsed.objetivos].some(
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
      const estado = { nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, cuentasAhorro };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (e) {
      console.error('Error guardando estado', e);
    }
  }, [nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, cuentasAhorro]);

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

  // Cargar datos desde Supabase
  useEffect(() => {
    console.log('🟣 useEffect de CARGA desde Supabase ejecutado!')

    const cargarDatos = async () => {
      console.log('🟣 Función cargarDatos iniciada')
      console.log('🟣 Session en carga:', session)

      if (!session?.user?.id) {
        console.log('❌ No hay sesión, saliendo de cargarDatos')
        return
      }

      console.log('🟣 User ID para cargar:', session.user.id)

      try {
        const supabase = createClient()
        console.log('🟣 Buscando datos financieros...')
        const { data: financialData, error: financialError } = await supabase
          .from('financial_data')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('mes_actual', mesActual)
          .maybeSingle()

        console.log('🟣 Datos financieros encontrados:', financialData)
        console.log('🟣 Error al cargar datos:', financialError)

        if (financialData) {
          console.log('✅ CARGANDO DATOS EN EL ESTADO...')
          setNombreUsuario(financialData.nombre_usuario || session?.user?.name || '')
          setIngresos(financialData.ingresos || [])
          setGastosFijos(financialData.gastos_fijos || [])
          setGastosVariables(financialData.gastos_variables || [])
          setDeudas(financialData.deudas || [])
          setCuentasAhorro(financialData.cuentas_ahorro || financialData.objetivos || [])
          setHistorialMensual(financialData.historial_mensual || [])
          setMostrarBienvenida(false)
          console.log('✅ DATOS CARGADOS EN EL ESTADO')
        } else {
          console.log('⚠️ No hay datos financieros para este mes')
          // Si no hay datos en Supabase, usar el nombre del usuario de la sesión
          if (session?.user?.name) {
            console.log('📝 Usando nombre de la sesión:', session.user.name)
            setNombreUsuario(session.user.name)
          }
        }
      } catch (error) {
        console.error('❌ Error cargando datos:', error)
      }
    }

    cargarDatos()
  }, [session, mesActual])

  // Guardar datos en Supabase
  useEffect(() => {
    console.log('🟢 useEffect de GUARDADO ejecutado!')
    console.log('🟢 Session actual:', session)
    console.log('🟢 NombreUsuario:', nombreUsuario)
    console.log('🟢 Ingresos length:', ingresos.length)

    // Debounce: esperar 1 segundo antes de guardar
    const timeoutId = setTimeout(() => {
      const guardarDatos = async () => {
        console.log('🔵 Iniciando guardado de datos (después de debounce)...')
        console.log('🔵 Session:', session)

        if (!session?.user?.id) {
          console.log('❌ No hay sesión de usuario')
          return
        }

        console.log('🔵 User ID de sesión:', session.user.id)

        try {
          const supabase = createClient()
          console.log('🔵 Preparando datos para guardar...')
          const datosAGuardar = {
            user_id: session.user.id,
            mes_actual: mesActual,
            ingresos,
            gastos_fijos: gastosFijos,
            gastos_variables: gastosVariables,
            deudas,
            cuentas_ahorro: cuentasAhorro
          }
          console.log('🔵 Datos a guardar:', datosAGuardar)

          console.log('🔵 Ejecutando upsert...')
          const { data, error } = await supabase
            .from('financial_data')
            .upsert(datosAGuardar, {
              onConflict: 'user_id,mes_actual'
            })

          if (error) {
            console.error('❌❌❌ ERROR AL GUARDAR EN SUPABASE ❌❌❌')
            console.error('❌ Error code:', error.code)
            console.error('❌ Error message:', error.message)
            console.error('❌ Error details:', error.details)
            console.error('❌ Error hint:', error.hint)
            console.error('❌ Full error object:', JSON.stringify(error, null, 2))

            // Mostrar notificación al usuario
            if (typeof mostrarNotificacion === 'function') {
              mostrarNotificacion(`Error guardando: ${error.message}`, 'error')
            }
          } else {
            console.log('✅✅✅ DATOS GUARDADOS EXITOSAMENTE EN SUPABASE ✅✅✅')
            console.log('✅ Data response:', data)
          }
        } catch (error) {
          console.error('❌ Error guardando datos:', error)
        }
      }

      guardarDatos()
    }, 1000) // Esperar 1 segundo

    // Cleanup: cancelar el timeout si el componente se desmonta o las dependencias cambian
    return () => clearTimeout(timeoutId)
  }, [session, nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, cuentasAhorro, historialMensual]);

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
  const totalDeudas = deudas.reduce((s, d) => s + ((parseFloat(d.montoTotal) || parseFloat(d.monto) || 0) - (parseFloat(d.totalPagado) || 0)), 0);
  const totalAhorros = cuentasAhorro.reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
  const saldoDisponible = totalIngresos - totalGastos;

  // CRUD - ingresos simple
  const añadirIngreso = () => {
    if (!nuevoIngreso.concepto || !nuevoIngreso.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoIngreso.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    const nuevo = { id: Date.now(), concepto: nuevoIngreso.concepto, monto, tipo: nuevoIngreso.tipo, fecha: nuevoIngreso.fecha };
    setIngresos((p) => [...p, nuevo]);
    setNuevoIngreso({ concepto: '', monto: '', tipo: 'Fijo', fecha: new Date().toISOString().split('T')[0] });
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

    const nuevo = {
      id: Date.now(),
      concepto: nuevoGastoVariable.concepto,
      monto,
      fecha: nuevoGastoVariable.fecha,
      categoria: nuevoGastoVariable.categoria || 'Otros'
    };
    setGastosVariables((p) => [...p, nuevo]);
    setNuevoGastoVariable({
      concepto: '',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'Alimentación'
    });
    mostrarNotificacion('Gasto variable añadido', 'success');
  };

  const eliminarGastoVariable = (id) => {
    setGastosVariables((p) => p.filter((g) => g.id !== id));
    mostrarNotificacion('Gasto variable eliminado', 'info');
  };

  // CRUD - deudas
  const añadirDeuda = () => {
    if (!nuevaDeuda.nombre || !nuevaDeuda.montoTotal) return mostrarNotificacion('Completa nombre y monto total', 'error');
    const montoTotal = parseFloat(nuevaDeuda.montoTotal);
    const plazoMeses = parseInt(nuevaDeuda.plazoMeses) || 1;
    // Redondear cuota mensual a 2 decimales
    const cuotaMensual = parseFloat(nuevaDeuda.cuotaMensual) || parseFloat((montoTotal / plazoMeses).toFixed(2));

    if (Number.isNaN(montoTotal) || montoTotal <= 0) return mostrarNotificacion('Monto inválido', 'error');
    if (plazoMeses <= 0) return mostrarNotificacion('Plazo inválido', 'error');

    const nuevo = {
      id: Date.now(),
      nombre: nuevaDeuda.nombre,
      montoTotal,
      plazoMeses,
      cuotaMensual,
      pagadoEsteMes: 0,
      totalPagado: 0
    };
    setDeudas((p) => [...p, nuevo]);
    setNuevaDeuda({ nombre: '', montoTotal: '', plazoMeses: '', cuotaMensual: '', pagadoEsteMes: 0, totalPagado: 0 });
    mostrarNotificacion('Deuda añadida', 'success');
  };

  const eliminarDeuda = (id) => {
    setDeudas((p) => p.filter((d) => d.id !== id));
    mostrarNotificacion('Deuda eliminada', 'info');
  };

  const registrarPagoDeuda = (id) => {
    const deuda = deudas.find(d => d.id === id);
    if (!deuda) return;

    const cuotaMensual = deuda.cuotaMensual || ((deuda.montoTotal || 0) / (deuda.plazoMeses || 1));
    const cantidad = prompt(`¿Cuánto vas a pagar? (Cuota mensual: ${cuotaMensual.toFixed(2)}€)`);

    if (!cantidad || cantidad.trim() === '') return;

    const montoPagar = parseFloat(cantidad);
    if (isNaN(montoPagar) || montoPagar <= 0) {
      mostrarNotificacion('Cantidad inválida', 'error');
      return;
    }

    setDeudas((p) => p.map((d) => {
      if (d.id === id) {
        const nuevoTotal = parseFloat(((d.totalPagado || 0) + montoPagar).toFixed(2));
        return { ...d, totalPagado: nuevoTotal, pagadoEsteMes: montoPagar };
      }
      return d;
    }));
    mostrarNotificacion(`Pago de ${montoPagar.toFixed(2)}€ registrado`, 'success');
  };

  // CRUD - cuentas de ahorro
  const añadirCuentaAhorro = () => {
    if (!nuevaCuentaAhorro.nombre || !nuevaCuentaAhorro.saldo) return mostrarNotificacion('Completa nombre y saldo', 'error');
    const saldo = parseFloat(nuevaCuentaAhorro.saldo);
    if (Number.isNaN(saldo) || saldo < 0) return mostrarNotificacion('Saldo inválido', 'error');

    const nuevo = { id: Date.now(), nombre: nuevaCuentaAhorro.nombre, saldo };
    setCuentasAhorro((p) => [...p, nuevo]);
    setNuevaCuentaAhorro({ nombre: '', saldo: '' });
    mostrarNotificacion('Cuenta de ahorro añadida', 'success');
  };

  const eliminarCuentaAhorro = (id) => {
    setCuentasAhorro((p) => p.filter((c) => c.id !== id));
    mostrarNotificacion('Cuenta eliminada', 'info');
  };

  const actualizarSaldoCuenta = (id, incremento) => {
    setCuentasAhorro((p) => p.map((c) => {
      if (c.id === id) {
        const nuevoSaldo = parseFloat(((c.saldo || 0) + incremento).toFixed(2));
        return { ...c, saldo: nuevoSaldo };
      }
      return c;
    }));
    mostrarNotificacion(incremento > 0 ? 'Dinero añadido' : 'Dinero retirado', 'success');
  };

  const añadirDineroCuenta = (id) => {
    const cantidad = prompt('¿Cuánto dinero quieres añadir?');
    if (cantidad && !isNaN(cantidad) && parseFloat(cantidad) > 0) {
      actualizarSaldoCuenta(id, parseFloat(cantidad));
    }
  };

  const retirarDineroCuenta = (id) => {
    const cuenta = cuentasAhorro.find(c => c.id === id);
    if (!cuenta) return;

    const cantidad = prompt('¿Cuánto dinero quieres retirar?');
    if (!cantidad || cantidad.trim() === '') return;

    const montoRetirar = parseFloat(cantidad);
    if (isNaN(montoRetirar) || montoRetirar <= 0) {
      mostrarNotificacion('Cantidad inválida', 'error');
      return;
    }

    if (montoRetirar > cuenta.saldo) {
      mostrarNotificacion('No puedes retirar más del saldo disponible', 'error');
      return;
    }

    actualizarSaldoCuenta(id, -montoRetirar);
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
        setCuentasAhorro(Array.isArray(datos.cuentasAhorro) ? datos.cuentasAhorro : Array.isArray(datos.objetivos) ? datos.objetivos : []);
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
    cuentasAhorro: cuentasAhorro.map((c) => ({ ...c })),
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
    setCuentasAhorro(Array.isArray(reg.cuentasAhorro) ? reg.cuentasAhorro : Array.isArray(reg.objetivos) ? reg.objetivos : []);
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
                <span className="font-medium">{nombreUsuario || 'Anónimo'}</span> • <span>{mesActual}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
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
                className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 ${
                  darkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                aria-label="Cerrar sesión"
              >
                <LogOut size={20} />
                <span className="text-sm font-medium">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación por pestañas */}
      <nav className={`sticky top-[88px] z-30 backdrop-blur-lg ${darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'} border-b transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
            {[
              { id: 'inicio', icon: <Home size={18} />, label: 'Inicio' },
              { id: 'ingresos', icon: <TrendingUp size={18} />, label: 'Ingresos' },
              { id: 'gastos-fijos', icon: <DollarSign size={18} />, label: 'Gastos Fijos' },
              { id: 'gastos-diarios', icon: <ShoppingCart size={18} />, label: 'Gastos Diarios' },
              { id: 'prestamos', icon: <CreditCard size={18} />, label: 'Préstamos' },
              { id: 'deudas', icon: <AlertCircle size={18} />, label: 'Deudas Varias' },
              { id: 'objetivos', icon: <Target size={18} />, label: 'Objetivos' },
              { id: 'estadisticas', icon: <BarChart3 size={18} />, label: 'Estadísticas' },
            ].map((vista) => (
              <button
                key={vista.id}
                onClick={() => setVistaActiva(vista.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap
                  transition-all duration-300 transform hover:scale-105
                  ${vistaActiva === vista.id
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {vista.icon}
                <span className="text-sm">{vista.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Vista: Inicio (Dashboard) */}
        {vistaActiva === 'inicio' && (
          <>
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
            <input
              aria-label="fecha"
              type="date"
              value={nuevoIngreso.fecha}
              onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, fecha: e.target.value })}
              className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
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
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {i.tipo} {i.fecha && `• ${new Date(i.fecha).toLocaleDateString('es-ES')}`}
                    </div>
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
            <select
              value={nuevoGastoVariable.categoria}
              onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, categoria: e.target.value })}
              className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                  : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
              }`}
            >
              {CATEGORIAS_GASTOS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {g.categoria && <span className="font-semibold">{g.categoria}</span>}
                      {g.categoria && g.fecha && ' • '}
                      {g.fecha && `📅 ${g.fecha}`}
                    </div>
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

          {/* Tabla de resumen por categoría */}
          {gastosVariables.length > 0 && (
            <div className="mt-6">
              <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Resumen por Categoría</h3>
              <div className={`overflow-hidden rounded-xl border-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <table className="w-full">
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Categoría</th>
                      <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total</th>
                      <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>%</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                    {(() => {
                      const categorias = {};
                      gastosVariables.forEach(g => {
                        const categoria = g.categoria || 'Otros';
                        categorias[categoria] = (categorias[categoria] || 0) + (parseFloat(g.monto) || 0);
                      });

                      return Object.entries(categorias)
                        .sort((a, b) => b[1] - a[1])
                        .map(([categoria, total]) => {
                          const porcentaje = totalGastosVariables > 0 ? (total / totalGastosVariables) * 100 : 0;
                          return (
                            <tr key={categoria} className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <td className={`px-4 py-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{categoria}</td>
                              <td className={`px-4 py-3 text-right font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                {total.toFixed(2)}€
                              </td>
                              <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {porcentaje.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
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
              placeholder="Monto Total"
              value={nuevaDeuda.montoTotal}
              onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, montoTotal: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                  : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
              }`}
            />
            <input
              placeholder="Plazo (meses)"
              value={nuevaDeuda.plazoMeses}
              onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, plazoMeses: e.target.value })}
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
            <ul className="space-y-4">
              {deudas.map((d) => {
                const montoTotal = d.montoTotal || d.monto || 0;
                const totalPagado = d.totalPagado || 0;
                const restante = montoTotal - totalPagado;
                const progreso = montoTotal > 0 ? (totalPagado / montoTotal) * 100 : 0;
                const cuotaMensual = d.cuotaMensual || (montoTotal / (d.plazoMeses || 1));

                return (
                  <li key={d.id} className={`p-5 rounded-xl transition-all duration-300 hover:scale-[1.01] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{d.nombre}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Cuota: <span className="font-semibold">{cuotaMensual.toFixed(2)}€/mes</span> •
                          {d.plazoMeses && ` ${d.plazoMeses} meses`}
                        </div>
                      </div>
                      <button onClick={() => eliminarDeuda(d.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Progreso</span>
                        <span className={`font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {progreso.toFixed(1)}%
                        </span>
                      </div>
                      <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progreso, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Total: <span className={`font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{montoTotal.toFixed(2)}€</span>
                        </div>
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Pagado: <span className="font-semibold">{totalPagado.toFixed(2)}€</span>
                        </div>
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Restante: <span className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{restante.toFixed(2)}€</span>
                        </div>
                      </div>

                      {restante > 0 && (
                        <button
                          onClick={() => registrarPagoDeuda(d.id)}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center gap-2 shadow-md transform hover:scale-105 transition-all duration-300"
                        >
                          <DollarSign size={18} /> Registrar Pago
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
            Total deudas: <strong className={darkMode ? 'text-purple-400' : 'text-purple-600'}>{totalDeudas.toFixed(2)} €</strong>
          </div>
        </section>

        {/* Objetivos */}
        <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Mis Ahorros</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <input
              placeholder="Nombre de la cuenta"
              value={nuevaCuentaAhorro.nombre}
              onChange={(e) => setNuevaCuentaAhorro({ ...nuevaCuentaAhorro, nombre: e.target.value })}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                  : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
            />
            <input
              placeholder="Saldo"
              value={nuevaCuentaAhorro.saldo}
              onChange={(e) => setNuevaCuentaAhorro({ ...nuevaCuentaAhorro, saldo: e.target.value })}
              className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                  : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
            />
            <button onClick={añadirCuentaAhorro} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
              <Plus size={20} /> Añadir
            </button>
          </div>
          {cuentasAhorro.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay cuentas de ahorro registradas.</p>
          ) : (
            <ul className="space-y-4">
              {cuentasAhorro.map((c) => (
                <li key={c.id} className={`p-5 rounded-xl transition-all duration-300 hover:scale-[1.01] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.nombre}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cuenta de ahorro</div>
                    </div>
                    <button onClick={() => eliminarCuentaAhorro(c.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className={`text-3xl font-bold mb-4 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                    {(c.saldo || 0).toFixed(2)} €
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => añadirDineroCuenta(c.id)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-md transform hover:scale-105 transition-all duration-300"
                    >
                      <Plus size={18} /> Añadir
                    </button>
                    <button
                      onClick={() => retirarDineroCuenta(c.id)}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-md transform hover:scale-105 transition-all duration-300"
                    >
                      <Download size={18} /> Retirar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
            Total ahorros: <strong className={darkMode ? 'text-teal-400' : 'text-teal-600'}>{totalAhorros.toFixed(2)} €</strong>
          </div>
        </section>
          </>
        )}

        {/* Vista: Préstamos */}
        {vistaActiva === 'prestamos' && (
          <LoanManager darkMode={darkMode} />
        )}

        {/* Vista: Ingresos */}
        {vistaActiva === 'ingresos' && (
          <>
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
          </>
        )}

        {/* Vista: Gastos Fijos */}
        {vistaActiva === 'gastos-fijos' && (
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
        )}

        {/* Vista: Gastos Diarios */}
        {vistaActiva === 'gastos-diarios' && (
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🛒 Gastos Diarios</h2>
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
              <select
                value={nuevoGastoVariable.categoria}
                onChange={(e) => setNuevoGastoVariable({ ...nuevoGastoVariable, categoria: e.target.value })}
                className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                    : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
              >
                {CATEGORIAS_GASTOS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
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
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay gastos diarios registrados.</p>
            ) : (
              <ul className="space-y-3">
                {gastosVariables.map((g) => (
                  <li key={g.id} className={`flex justify-between items-center p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                    <div>
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{g.concepto}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {g.categoria && <span className="font-semibold">{g.categoria}</span>}
                        {g.categoria && g.fecha && ' • '}
                        {g.fecha && `📅 ${g.fecha}`}
                      </div>
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

            {/* Tabla de resumen por categoría */}
            {gastosVariables.length > 0 && (
              <div className="mt-6">
                <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Resumen por Categoría</h3>
                <div className={`overflow-hidden rounded-xl border-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Categoría</th>
                        <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total</th>
                        <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>%</th>
                      </tr>
                    </thead>
                    <tbody className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                      {(() => {
                        const categorias = {};
                        gastosVariables.forEach(g => {
                          const categoria = g.categoria || 'Otros';
                          categorias[categoria] = (categorias[categoria] || 0) + (parseFloat(g.monto) || 0);
                        });

                        return Object.entries(categorias)
                          .sort((a, b) => b[1] - a[1])
                          .map(([categoria, total]) => {
                            const porcentaje = totalGastosVariables > 0 ? (total / totalGastosVariables) * 100 : 0;
                            return (
                              <tr key={categoria} className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <td className={`px-4 py-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{categoria}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                  {total.toFixed(2)}€
                                </td>
                                <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {porcentaje.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Total gastos diarios: <strong className={darkMode ? 'text-orange-400' : 'text-orange-600'}>{totalGastosVariables.toFixed(2)} €</strong>
            </div>
          </section>
        )}

        {/* Vista: Deudas Varias */}
        {vistaActiva === 'deudas' && (
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💳 Deudas Varias</h2>
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
                placeholder="Monto Total"
                value={nuevaDeuda.montoTotal}
                onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, montoTotal: e.target.value })}
                className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                    : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                }`}
              />
              <input
                placeholder="Plazo (meses)"
                value={nuevaDeuda.plazoMeses}
                onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, plazoMeses: e.target.value })}
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
              <ul className="space-y-4">
                {deudas.map((d) => {
                  const montoTotal = d.montoTotal || d.monto || 0;
                  const totalPagado = d.totalPagado || 0;
                  const restante = montoTotal - totalPagado;
                  const progreso = montoTotal > 0 ? (totalPagado / montoTotal) * 100 : 0;
                  const cuotaMensual = d.cuotaMensual || (montoTotal / (d.plazoMeses || 1));

                  return (
                    <li key={d.id} className={`p-5 rounded-xl transition-all duration-300 hover:scale-[1.01] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{d.nombre}</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Cuota: <span className="font-semibold">{cuotaMensual.toFixed(2)}€/mes</span> •
                            {d.plazoMeses && ` ${d.plazoMeses} meses`}
                          </div>
                        </div>
                        <button onClick={() => eliminarDeuda(d.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Progreso</span>
                          <span className={`font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                            {progreso.toFixed(1)}%
                          </span>
                        </div>
                        <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progreso, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Total: <span className={`font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{montoTotal.toFixed(2)}€</span>
                          </div>
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Pagado: <span className="font-semibold">{totalPagado.toFixed(2)}€</span>
                          </div>
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Restante: <span className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{restante.toFixed(2)}€</span>
                          </div>
                        </div>

                        {restante > 0 && (
                          <button
                            onClick={() => registrarPagoDeuda(d.id)}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center gap-2 shadow-md transform hover:scale-105 transition-all duration-300"
                          >
                            <DollarSign size={18} /> Registrar Pago
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Total deudas: <strong className={darkMode ? 'text-purple-400' : 'text-purple-600'}>{totalDeudas.toFixed(2)} €</strong>
            </div>
          </section>
        )}

        {/* Vista: Mis Ahorros */}
        {vistaActiva === 'objetivos' && (
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Mis Ahorros</h2>
            <div className="flex gap-3 flex-wrap mb-4">
              <input
                placeholder="Nombre de la cuenta"
                value={nuevaCuentaAhorro.nombre}
                onChange={(e) => setNuevaCuentaAhorro({ ...nuevaCuentaAhorro, nombre: e.target.value })}
                className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                    : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
                }`}
              />
              <input
                placeholder="Saldo"
                value={nuevaCuentaAhorro.saldo}
                onChange={(e) => setNuevaCuentaAhorro({ ...nuevaCuentaAhorro, saldo: e.target.value })}
                className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                    : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
                }`}
              />
              <button onClick={añadirCuentaAhorro} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300">
                <Plus size={20} /> Añadir
              </button>
            </div>
            {cuentasAhorro.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay cuentas de ahorro registradas.</p>
            ) : (
              <ul className="space-y-4">
                {cuentasAhorro.map((c) => (
                  <li key={c.id} className={`p-5 rounded-xl transition-all duration-300 hover:scale-[1.01] ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.nombre}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cuenta de ahorro</div>
                      </div>
                      <button onClick={() => eliminarCuentaAhorro(c.id)} className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className={`text-3xl font-bold mb-4 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                      {(c.saldo || 0).toFixed(2)} €
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => añadirDineroCuenta(c.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-md transform hover:scale-105 transition-all duration-300"
                      >
                        <Plus size={18} /> Añadir
                      </button>
                      <button
                        onClick={() => retirarDineroCuenta(c.id)}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-md transform hover:scale-105 transition-all duration-300"
                      >
                        <Download size={18} /> Retirar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Total ahorros: <strong className={darkMode ? 'text-teal-400' : 'text-teal-600'}>{totalAhorros.toFixed(2)} €</strong>
            </div>
          </section>
        )}

        {/* Vista: Estadísticas */}
        {vistaActiva === 'estadisticas' && (
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Estadísticas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-400 to-green-500'}`}>
                <p className="text-white/80 text-sm font-medium mb-2">💰 Total Ingresos</p>
                <p className="text-white text-3xl font-bold">{totalIngresos.toFixed(2)} €</p>
              </div>
              <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-red-400 to-red-500'}`}>
                <p className="text-white/80 text-sm font-medium mb-2">💸 Total Gastos</p>
                <p className="text-white text-3xl font-bold">{totalGastos.toFixed(2)} €</p>
              </div>
              <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
                <p className="text-white/80 text-sm font-medium mb-2">💵 Saldo Final</p>
                <p className="text-white text-3xl font-bold">{saldoDisponible.toFixed(2)} €</p>
              </div>
              <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
                <p className="text-white/80 text-sm font-medium mb-2">🏦 Total Deudas</p>
                <p className="text-white text-3xl font-bold">{totalDeudas.toFixed(2)} €</p>
              </div>
            </div>
            <div className={`mt-6 p-6 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📅 Historial Mensual</h3>
              {historialMensual.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay historial guardado</p>
              ) : (
                <div className="grid gap-4">
                  {historialMensual.map(h => (
                    <div key={h.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                      <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{h.mes}</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className={darkMode ? 'text-green-400' : 'text-green-600'}>
                          Ingresos: {h.totales?.totalIngresos?.toFixed(2)} €
                        </div>
                        <div className={darkMode ? 'text-red-400' : 'text-red-600'}>
                          Gastos: {h.totales?.totalGastos?.toFixed(2)} €
                        </div>
                        <div className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                          Saldo: {h.totales?.saldoDisponible?.toFixed(2)} €
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
