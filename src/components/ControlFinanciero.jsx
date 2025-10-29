'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, Save, Calendar, AlertCircle, Moon, Sun, LogOut, CreditCard, Home, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, BarChart3, CheckCircle, Info, Edit2, ChevronLeft, ChevronRight, LineChart, Eye, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { createClient } from '@/lib/supabase';
import LoanManager from './loans/LoanManager';
import useLoans from '@/hooks/useLoans';

const STORAGE_KEY = 'controlFinancieroEstado';
const HISTORY_KEY = 'controlFinancieroHistorial';
const THEME_KEY = 'controlFinancieroTheme';

export default function ControlFinanciero() {
  console.log('🟢 COMPONENTE RENDERIZADO - ControlFinanciero montado')

  const { data: session } = useSession();
  const { loans, getStatistics } = useLoans();
  const fileInputRef = useRef(null);

  // Estado de navegación
  const [vistaActiva, setVistaActiva] = useState('inicio');
  const [tipoGastoActivo, setTipoGastoActivo] = useState('fijo'); // 'fijo' o 'variable'

  // Estado de navegación mensual
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  // Estado inicial
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [mesActual, setMesActual] = useState(
    new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  // Estado para notificaciones
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

  // Estado para modo oscuro
  const [darkMode, setDarkMode] = useState(false);

  // Estado para widget resumen
  const [mostrarWidget, setMostrarWidget] = useState(true);

  // Estados para FASE 2: Reorganización y Tabs
  const [tabActivoInicio, setTabActivoInicio] = useState('datos'); // 'datos' o 'formularios'
  const [tabActivoRegistros, setTabActivoRegistros] = useState('ingresos'); // 'ingresos', 'gastosFijos', 'gastosVariables'
  const [seccionesColapsadas, setSeccionesColapsadas] = useState({
    listas: false,
    formularios: false,
    deudas: false,
    ahorros: false
  });

  // Función para alternar colapso de secciones
  const toggleSeccion = (seccion) => {
    setSeccionesColapsadas(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }));
  };

  // Datos principales
  const [ingresos, setIngresos] = useState([]);
  const [nuevoIngreso, setNuevoIngreso] = useState({ concepto: '', monto: '', tipo: 'Fijo', fecha: new Date().toISOString().split('T')[0] });

  // GASTOS UNIFICADOS: fusión de gastosFijos y gastosVariables
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({
    concepto: '',
    monto: '',
    categoria: 'Alimentación',
    tipo: 'fijo', // 'fijo' o 'variable'
    fecha: new Date().toISOString().split('T')[0]
  });

  // Estados separados para formularios de la vista de inicio (mantener UX separada)
  const [nuevoGastoFijo, setNuevoGastoFijo] = useState({ concepto: '', monto: '' });
  const [nuevoGastoVariable, setNuevoGastoVariable] = useState({
    concepto: '',
    monto: '',
    categoria: 'Alimentación',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Categorías predefinidas para gastos
  const CATEGORIAS_GASTOS = [
    'Alimentación',
    'Transporte',
    'Ocio',
    'Salud',
    'Educación',
    'Hogar',
    'Ropa',
    'Tecnología',
    'Vivienda',
    'Servicios',
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

  // Flag para evitar guardar antes de cargar
  const [datosCargados, setDatosCargados] = useState(false);

  // Estados para edición
  const [editandoIngreso, setEditandoIngreso] = useState(null);
  const [editandoGasto, setEditandoGasto] = useState(null);
  const [editandoDeuda, setEditandoDeuda] = useState(null);
  const [valoresTemp, setValoresTemp] = useState({});

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

        // RETROCOMPATIBILIDAD: fusionar gastosFijos y gastosVariables en gastos
        if (Array.isArray(parsed.gastos)) {
          // Formato nuevo: ya tiene array unificado
          setGastos(parsed.gastos);
        } else {
          // Formato antiguo: fusionar arrays separados
          const gastosFijos = (Array.isArray(parsed.gastosFijos) ? parsed.gastosFijos : []).map(g => ({
            ...g,
            tipo: 'fijo',
            fecha: null,
            categoria: g.categoria || 'Vivienda'
          }));
          const gastosVariables = (Array.isArray(parsed.gastosVariables) ? parsed.gastosVariables : []).map(g => ({
            ...g,
            tipo: 'variable',
            categoria: g.categoria || 'Otros'
          }));
          setGastos([...gastosFijos, ...gastosVariables]);
        }

        setDeudas(Array.isArray(parsed.deudas) ? parsed.deudas : []);
        setCuentasAhorro(Array.isArray(parsed.cuentasAhorro) ? parsed.cuentasAhorro : Array.isArray(parsed.objetivos) ? parsed.objetivos : []);

        if (
          [parsed.ingresos, parsed.gastos, parsed.gastosFijos, parsed.gastosVariables, parsed.deudas, parsed.cuentasAhorro, parsed.objetivos].some(
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
      const estado = { nombreUsuario, mesActual, ingresos, gastos, deudas, cuentasAhorro };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (e) {
      console.error('Error guardando estado', e);
    }
  }, [nombreUsuario, mesActual, ingresos, gastos, deudas, cuentasAhorro]);

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

      // Resetear el flag al iniciar la carga
      setDatosCargados(false)

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

          // MIGRAR DATOS ANTIGUOS: agregar campo 'mes' a datos que no lo tengan
          const mesActual = (() => {
            const hoy = new Date();
            return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
          })();

          setNombreUsuario(financialData.nombre_usuario || session?.user?.name || '')

          // Migrar ingresos
          const ingresosMigrados = (financialData.ingresos || []).map(i => ({
            ...i,
            mes: i.mes || mesActual
          }));
          setIngresos(ingresosMigrados);

          // FUSIONAR gastos_fijos y gastos_variables en un solo array + migrar
          const gastosFijos = (Array.isArray(financialData.gastos_fijos) ? financialData.gastos_fijos : []).map(g => ({
            ...g,
            tipo: 'fijo',
            fecha: g.fecha || null,
            categoria: g.categoria || 'Vivienda',
            mes: g.mes || mesActual  // Migrar
          }));
          const gastosVariables = (Array.isArray(financialData.gastos_variables) ? financialData.gastos_variables : []).map(g => ({
            ...g,
            tipo: 'variable',
            categoria: g.categoria || 'Otros',
            mes: g.mes || mesActual  // Migrar
          }));
          setGastos([...gastosFijos, ...gastosVariables]);
          console.log('📊 Gastos cargados:', { fijos: gastosFijos.length, variables: gastosVariables.length, total: gastosFijos.length + gastosVariables.length })

          // Migrar deudas
          const deudasMigradas = (financialData.deudas || []).map(d => ({
            ...d,
            mes: d.mes || mesActual
          }));
          setDeudas(deudasMigradas)
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

        // Marcar que los datos ya fueron cargados (o intentados cargar)
        console.log('🏁 Marcando datos como cargados')
        setDatosCargados(true)
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
    console.log('🟢 Datos cargados:', datosCargados)

    // NO GUARDAR si los datos aún no se han cargado desde Supabase
    if (!datosCargados) {
      console.log('⏸️ Datos aún no cargados, omitiendo guardado')
      return
    }

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

          // Separar gastos por tipo para mantener compatibilidad con schema de Supabase
          const gastosFijos = gastos.filter(g => g.tipo === 'fijo');
          const gastosVariables = gastos.filter(g => g.tipo === 'variable');

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
  }, [session, nombreUsuario, mesActual, ingresos, gastos, deudas, cuentasAhorro, historialMensual, datosCargados]);

  // Notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 3000);
  };

  // ==========================================
  // FUNCIONES DE NAVEGACIÓN MENSUAL
  // ==========================================

  // Función para obtener nombre del mes en español
  const obtenerNombreMes = (mesStr) => {
    const [year, month] = mesStr.split('-');
    const fecha = new Date(year, parseInt(month) - 1);
    return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Función para cambiar de mes (anterior/siguiente)
  const cambiarMes = (direccion) => {
    const [year, month] = mesVisible.split('-').map(Number);
    const fecha = new Date(year, month - 1);

    if (direccion === 'anterior') {
      fecha.setMonth(fecha.getMonth() - 1);
    } else {
      fecha.setMonth(fecha.getMonth() + 1);
    }

    const nuevoMes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    setMesVisible(nuevoMes);
  };

  // Función para volver al mes actual
  const getMesActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  };

  // ==========================================
  // COMPARACIÓN MENSUAL
  // ==========================================
  const obtenerComparacionMensual = (mesActual) => {
    // Obtener mes anterior
    const [year, month] = mesActual.split('-').map(Number);
    const fechaAnterior = new Date(year, month - 2); // -2 porque los meses empiezan en 0
    const mesAnterior = `${fechaAnterior.getFullYear()}-${String(fechaAnterior.getMonth() + 1).padStart(2, '0')}`;

    // Calcular totales del mes actual
    const ingresosActual = ingresos
      .filter(i => i.mes === mesActual)
      .reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);
    const gastosActual = gastos
      .filter(g => g.mes === mesActual)
      .reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

    // Calcular totales del mes anterior
    const ingresosAnterior = ingresos
      .filter(i => i.mes === mesAnterior)
      .reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);
    const gastosAnterior = gastos
      .filter(g => g.mes === mesAnterior)
      .reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

    // Calcular diferencias
    const difIngresos = ingresosActual - ingresosAnterior;
    const difGastos = gastosActual - gastosAnterior;
    const porcIngresos = ingresosAnterior > 0 ? ((difIngresos / ingresosAnterior) * 100) : 0;
    const porcGastos = gastosAnterior > 0 ? ((difGastos / gastosAnterior) * 100) : 0;

    return {
      mesAnterior: obtenerNombreMes(mesAnterior),
      ingresosActual,
      gastosActual,
      ingresosAnterior,
      gastosAnterior,
      difIngresos,
      difGastos,
      porcIngresos,
      porcGastos,
      hayDatos: ingresosAnterior > 0 || gastosAnterior > 0
    };
  };

  // ==========================================
  // MIGRACIÓN DE DATOS ANTIGUOS
  // ==========================================
  // Función para migrar datos sin campo 'mes' asignándoles el mes actual
  const migrarDatosAntiguos = (datos) => {
    const mesActual = getMesActual();

    return {
      ...datos,
      ingresos: datos.ingresos?.map(i => ({
        ...i,
        mes: i.mes || mesActual
      })) || [],
      gastos: datos.gastos?.map(g => ({
        ...g,
        mes: g.mes || mesActual
      })) || [],
      deudas: datos.deudas?.map(d => ({
        ...d,
        mes: d.mes || mesActual
      })) || []
    };
  };

  // ==========================================
  // DATOS HISTÓRICOS PARA EVOLUCIÓN
  // ==========================================
  const obtenerDatosHistoricos = () => {
    // Agrupar todos los datos por mes
    const mesesMap = {};

    // Agregar ingresos
    ingresos.forEach(item => {
      const mes = item.mes || getMesActual();
      if (!mesesMap[mes]) mesesMap[mes] = { mes, ingresos: 0, gastos: 0, deudas: 0 };
      mesesMap[mes].ingresos += parseFloat(item.monto) || 0;
    });

    // Agregar gastos
    gastos.forEach(item => {
      const mes = item.mes || getMesActual();
      if (!mesesMap[mes]) mesesMap[mes] = { mes, ingresos: 0, gastos: 0, deudas: 0 };
      mesesMap[mes].gastos += parseFloat(item.monto) || 0;
    });

    // Agregar deudas
    deudas.forEach(item => {
      const mes = item.mes || getMesActual();
      if (!mesesMap[mes]) mesesMap[mes] = { mes, ingresos: 0, gastos: 0, deudas: 0 };
      const montoTotal = parseFloat(item.montoTotal) || parseFloat(item.monto) || 0;
      const totalPagado = parseFloat(item.totalPagado) || 0;
      mesesMap[mes].deudas += montoTotal - totalPagado;
    });

    // Convertir a array y ordenar por fecha
    return Object.values(mesesMap)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map(mes => ({
        ...mes,
        balance: mes.ingresos - mes.gastos,
        nombreMes: obtenerNombreMes(mes.mes)
      }));
  };

  // ==========================================
  // FILTRADO DE DATOS POR MES VISIBLE
  // ==========================================
  // Filtrar datos por mes visible (backward compatibility: sin mes = mes actual)
  const mesActualStr = getMesActual();
  const ingresosMesActual = ingresos.filter(item => item.mes === mesVisible || (!item.mes && mesVisible === mesActualStr));
  const gastosMesActual = gastos.filter(item => item.mes === mesVisible || (!item.mes && mesVisible === mesActualStr));
  const deudasMesActual = deudas.filter(item => item.mes === mesVisible || (!item.mes && mesVisible === mesActualStr));

  // Totales basados en datos filtrados del mes visible
  const totalIngresos = ingresosMesActual.reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);
  const totalGastosFijos = gastosMesActual.filter(g => g.tipo === 'fijo').reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);
  const totalGastosVariables = gastosMesActual.filter(g => g.tipo === 'variable').reduce((s, it) => s + (parseFloat(it.monto) || 0), 0);
  const totalGastos = totalGastosFijos + totalGastosVariables;
  // Calcular totales de deudas y préstamos
  const totalDeudas = deudasMesActual.reduce((s, d) => s + ((parseFloat(d.montoTotal) || parseFloat(d.monto) || 0) - (parseFloat(d.totalPagado) || 0)), 0);
  const loanStats = getStatistics();
  const totalPrestamos = loanStats.totalDebt || 0;
  const deudaTotalCombinada = totalDeudas + totalPrestamos;
  const totalAhorros = cuentasAhorro.reduce((s, c) => s + (parseFloat(c.saldo) || 0), 0);
  const saldoDisponible = totalIngresos - totalGastos;

  // Variables derivadas para vista de inicio (basadas en datos filtrados)
  const gastosFijos = gastosMesActual.filter(g => g.tipo === 'fijo');
  const gastosVariables = gastosMesActual.filter(g => g.tipo === 'variable');

  // CRUD - ingresos simple
  const añadirIngreso = () => {
    if (!nuevoIngreso.concepto || !nuevoIngreso.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoIngreso.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    // Derivar el mes desde la fecha del ingreso (formato: YYYY-MM)
    const fechaIngreso = new Date(nuevoIngreso.fecha);
    const mesDelIngreso = `${fechaIngreso.getFullYear()}-${String(fechaIngreso.getMonth() + 1).padStart(2, '0')}`;

    const nuevo = {
      id: Date.now(),
      concepto: nuevoIngreso.concepto,
      monto,
      tipo: nuevoIngreso.tipo,
      fecha: nuevoIngreso.fecha,
      mes: mesDelIngreso  // ← Derivar del campo fecha
    };
    setIngresos((p) => [...p, nuevo]);
    setNuevoIngreso({ concepto: '', monto: '', tipo: 'Fijo', fecha: new Date().toISOString().split('T')[0] });
    setMostrarBienvenida(false);
    mostrarNotificacion('Ingreso añadido', 'success');
  };

  const eliminarIngreso = (id) => {
    setIngresos((p) => p.filter((i) => i.id !== id));
    mostrarNotificacion('Ingreso eliminado', 'info');
  };

  // CRUD - gastos unificados
  const añadirGasto = () => {
    if (!nuevoGasto.concepto || !nuevoGasto.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoGasto.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    // Usar el filtro activo para determinar el tipo, NO nuevoGasto.tipo
    const tipoReal = tipoGastoActivo === 'fijo' || tipoGastoActivo === 'variable' ? tipoGastoActivo : 'fijo';

    // Determinar el mes: si es variable con fecha, derivar de la fecha; si es fijo, usar mes visible
    let mesDelGasto = mesVisible;
    if (tipoReal === 'variable' && nuevoGasto.fecha) {
      const fechaGasto = new Date(nuevoGasto.fecha);
      mesDelGasto = `${fechaGasto.getFullYear()}-${String(fechaGasto.getMonth() + 1).padStart(2, '0')}`;
    }

    const nuevo = {
      id: Date.now(),
      concepto: nuevoGasto.concepto,
      monto,
      categoria: nuevoGasto.categoria || (tipoReal === 'fijo' ? 'Vivienda' : 'Otros'),
      tipo: tipoReal, // Usar el tipo del filtro activo
      fecha: tipoReal === 'variable' ? nuevoGasto.fecha : null,
      mes: mesDelGasto  // ← Derivar de fecha si es variable, sino usar mes visible
    };

    setGastos((p) => [...p, nuevo]);
    setNuevoGasto({
      concepto: '',
      monto: '',
      categoria: 'Alimentación',
      tipo: tipoReal, // Mantener el tipo del filtro activo
      fecha: new Date().toISOString().split('T')[0]
    });

    const tipoTexto = tipoReal === 'fijo' ? 'Gasto fijo' : 'Gasto variable';
    mostrarNotificacion(`${tipoTexto} añadido`, 'success');
  };

  const eliminarGasto = (id) => {
    setGastos((p) => p.filter((g) => g.id !== id));
    mostrarNotificacion('Gasto eliminado', 'info');
  };

  // Funciones helper para vista de inicio (usan sistema unificado)
  const añadirGastoFijo = () => {
    if (!nuevoGastoFijo.concepto || !nuevoGastoFijo.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoGastoFijo.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    const nuevo = {
      id: Date.now(),
      concepto: nuevoGastoFijo.concepto,
      monto,
      categoria: 'Vivienda',
      tipo: 'fijo',
      fecha: null,
      mes: mesVisible  // ← Asignar mes visible
    };

    setGastos((p) => [...p, nuevo]);
    setNuevoGastoFijo({ concepto: '', monto: '' });
    setMostrarBienvenida(false);
    mostrarNotificacion('Gasto fijo añadido', 'success');
  };

  const eliminarGastoFijo = (id) => eliminarGasto(id);

  const añadirGastoVariable = () => {
    if (!nuevoGastoVariable.concepto || !nuevoGastoVariable.monto) return mostrarNotificacion('Completa concepto y monto', 'error');
    const monto = parseFloat(nuevoGastoVariable.monto);
    if (Number.isNaN(monto) || monto <= 0) return mostrarNotificacion('Monto inválido', 'error');

    // Derivar el mes desde la fecha del gasto
    const fechaGasto = new Date(nuevoGastoVariable.fecha);
    const mesDelGasto = `${fechaGasto.getFullYear()}-${String(fechaGasto.getMonth() + 1).padStart(2, '0')}`;

    const nuevo = {
      id: Date.now(),
      concepto: nuevoGastoVariable.concepto,
      monto,
      categoria: nuevoGastoVariable.categoria,
      tipo: 'variable',
      fecha: nuevoGastoVariable.fecha,
      mes: mesDelGasto  // ← Derivar del campo fecha
    };

    setGastos((p) => [...p, nuevo]);
    setNuevoGastoVariable({
      concepto: '',
      monto: '',
      categoria: 'Alimentación',
      fecha: new Date().toISOString().split('T')[0]
    });
    setMostrarBienvenida(false);
    mostrarNotificacion('Gasto variable añadido', 'success');
  };

  const eliminarGastoVariable = (id) => eliminarGasto(id);

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
      totalPagado: 0,
      mes: mesVisible  // ← Asignar mes visible
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

    // Actualizar deuda
    setDeudas((p) => p.map((d) => {
      if (d.id === id) {
        const nuevoTotal = parseFloat(((d.totalPagado || 0) + montoPagar).toFixed(2));
        return { ...d, totalPagado: nuevoTotal, pagadoEsteMes: montoPagar };
      }
      return d;
    }));

    // Crear gasto automático para reflejar el pago en el balance
    const nuevoGastoPago = {
      id: Date.now(),
      concepto: `Pago deuda - ${deuda.nombre}`,
      monto: montoPagar,
      categoria: 'Servicios',
      tipo: 'variable',
      fecha: new Date().toISOString().split('T')[0]
    };
    setGastos((p) => [...p, nuevoGastoPago]);

    mostrarNotificacion(`Pago de ${montoPagar.toFixed(2)}€ registrado`, 'success');
  };

  // Función helper para crear gastos automáticos (usada por préstamos, deudas, etc.)
  const crearGastoAutomatico = (concepto, monto, categoria = 'Finanzas') => {
    const fechaHoy = new Date();
    const fechaStr = fechaHoy.toISOString().split('T')[0];
    const mesDelGasto = `${fechaHoy.getFullYear()}-${String(fechaHoy.getMonth() + 1).padStart(2, '0')}`;

    const nuevoGasto = {
      id: Date.now(),
      concepto,
      monto: parseFloat(monto),
      categoria,
      tipo: 'variable',
      fecha: fechaStr,
      mes: mesDelGasto  // ← Derivar de la fecha actual
    };
    setGastos((p) => [...p, nuevoGasto]);
    return nuevoGasto;
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

  // Funciones de edición
  const iniciarEdicionIngreso = (ingreso) => {
    setEditandoIngreso(ingreso.id);
    setValoresTemp({ ...ingreso });
  };

  const cancelarEdicionIngreso = () => {
    setEditandoIngreso(null);
    setValoresTemp({});
  };

  const guardarEdicionIngreso = () => {
    if (!valoresTemp.concepto || !valoresTemp.monto) {
      mostrarNotificacion('Completa todos los campos', 'error');
      return;
    }

    const monto = parseFloat(valoresTemp.monto);
    if (isNaN(monto) || monto <= 0) {
      mostrarNotificacion('Monto inválido', 'error');
      return;
    }

    setIngresos((p) => p.map((ing) =>
      ing.id === editandoIngreso
        ? { ...valoresTemp, monto }
        : ing
    ));
    setEditandoIngreso(null);
    setValoresTemp({});
    mostrarNotificacion('Ingreso actualizado', 'success');
  };

  const iniciarEdicionGasto = (gasto) => {
    setEditandoGasto(gasto.id);
    setValoresTemp({ ...gasto });
  };

  const cancelarEdicionGasto = () => {
    setEditandoGasto(null);
    setValoresTemp({});
  };

  const guardarEdicionGasto = () => {
    if (!valoresTemp.concepto || !valoresTemp.monto) {
      mostrarNotificacion('Completa todos los campos', 'error');
      return;
    }

    const monto = parseFloat(valoresTemp.monto);
    if (isNaN(monto) || monto <= 0) {
      mostrarNotificacion('Monto inválido', 'error');
      return;
    }

    setGastos((p) => p.map((gasto) =>
      gasto.id === editandoGasto
        ? { ...valoresTemp, monto }
        : gasto
    ));
    setEditandoGasto(null);
    setValoresTemp({});
    mostrarNotificacion('Gasto actualizado', 'success');
  };

  const iniciarEdicionDeuda = (deuda) => {
    setEditandoDeuda(deuda.id);
    setValoresTemp({ ...deuda });
  };

  const cancelarEdicionDeuda = () => {
    setEditandoDeuda(null);
    setValoresTemp({});
  };

  const guardarEdicionDeuda = () => {
    if (!valoresTemp.nombre || !valoresTemp.montoTotal) {
      mostrarNotificacion('Completa nombre y monto total', 'error');
      return;
    }

    const montoTotal = parseFloat(valoresTemp.montoTotal);
    const plazoMeses = parseFloat(valoresTemp.plazoMeses || 0);
    const cuotaMensual = parseFloat(valoresTemp.cuotaMensual || 0);
    const totalPagado = parseFloat(valoresTemp.totalPagado || 0);

    if (isNaN(montoTotal) || montoTotal <= 0) {
      mostrarNotificacion('Monto total inválido', 'error');
      return;
    }

    setDeudas((p) => p.map((deuda) =>
      deuda.id === editandoDeuda
        ? {
            ...valoresTemp,
            montoTotal,
            plazoMeses,
            cuotaMensual,
            totalPagado
          }
        : deuda
    ));
    setEditandoDeuda(null);
    setValoresTemp({});
    mostrarNotificacion('Deuda actualizada', 'success');
  };

  // Export / Import
  const exportarDatos = () => {
    try {
      const datos = {
        nombreUsuario,
        mesActual,
        ingresos,
        gastos, // Nuevo formato unificado
        deudas,
        cuentasAhorro,
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

        // RETROCOMPATIBILIDAD: fusionar gastosFijos y gastosVariables si el formato es antiguo
        if (Array.isArray(datos.gastos)) {
          // Formato nuevo: ya tiene array unificado
          setGastos(datos.gastos);
        } else {
          // Formato antiguo: fusionar arrays separados
          const gastosFijos = (Array.isArray(datos.gastosFijos) ? datos.gastosFijos : []).map(g => ({
            ...g,
            tipo: 'fijo',
            fecha: null,
            categoria: g.categoria || 'Vivienda'
          }));
          const gastosVariables = (Array.isArray(datos.gastosVariables) ? datos.gastosVariables : []).map(g => ({
            ...g,
            tipo: 'variable',
            categoria: g.categoria || 'Otros'
          }));
          setGastos([...gastosFijos, ...gastosVariables]);
        }

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
    gastos: gastos.map((g) => ({ ...g })), // Nuevo formato unificado
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

    // RETROCOMPATIBILIDAD: fusionar gastosFijos y gastosVariables del historial
    if (Array.isArray(reg.gastos)) {
      // Formato nuevo: ya tiene array unificado
      setGastos(reg.gastos);
    } else {
      // Formato antiguo: fusionar arrays separados
      const gastosFijos = (Array.isArray(reg.gastosFijos) ? reg.gastosFijos : []).map(g => ({
        ...g,
        tipo: 'fijo',
        fecha: g.fecha || null,
        categoria: g.categoria || 'Vivienda'
      }));
      const gastosVariables = (Array.isArray(reg.gastosVariables) ? reg.gastosVariables : []).map(g => ({
        ...g,
        tipo: 'variable',
        categoria: g.categoria || 'Otros'
      }));
      setGastos([...gastosFijos, ...gastosVariables]);
    }

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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}>
      {notificacion.show && (
        <div
          className={`fixed top-4 right-4 z-[100] transform transition-all duration-500 animate-[slideDown_0.5s_ease-out] ${
            notificacion.tipo === 'success' ? 'bg-[#10b981]' : notificacion.tipo === 'error' ? 'bg-[#ef4444]' : 'bg-[#3b82f6]'
          } text-white px-6 py-4 rounded-xl shadow-2xl max-w-md`}
          style={{
            animation: 'slideDown 0.5s ease-out'
          }}
        >
          <div className="flex items-center gap-3">
            {notificacion.tipo === 'success' && <CheckCircle size={24} className="flex-shrink-0" />}
            {notificacion.tipo === 'error' && <AlertCircle size={24} className="flex-shrink-0" />}
            {notificacion.tipo === 'info' && <Info size={24} className="flex-shrink-0" />}
            <span className="font-semibold text-base">{notificacion.mensaje}</span>
          </div>
          {/* Barra de progreso */}
          <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-white/80 animate-[shrink_3s_linear]"
              style={{
                animation: 'shrink 3s linear'
              }}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        /* Ocultar scrollbar pero mantener funcionalidad */
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <header className={`sticky top-0 z-40 backdrop-blur-lg ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'} border-b transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
                💰 Control Financiero
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="font-medium">{nombreUsuario || 'Anónimo'}</span> • <span>{mesActual}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 min-h-[44px] min-w-[44px] rounded-xl transition-all duration-300 hover:scale-110 ${
                  darkMode ? 'bg-slate-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className={`p-3 min-h-[44px] rounded-xl transition-all duration-300 hover:scale-110 flex items-center gap-3 ${
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
      <nav className={`sticky top-[88px] z-30 backdrop-blur-lg ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'} border-b transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto py-4 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch]" style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {[
              { id: 'inicio', icon: <Home size={18} />, label: 'Inicio' },
              { id: 'ingresos', icon: <TrendingUp size={18} />, label: 'Ingresos' },
              { id: 'gastos', icon: <ShoppingCart size={18} />, label: 'Gastos' },
              { id: 'prestamos', icon: <CreditCard size={18} />, label: 'Préstamos' },
              { id: 'deudas', icon: <AlertCircle size={18} />, label: 'Deudas' },
              { id: 'objetivos', icon: <Target size={18} />, label: 'Mis Ahorros' },
              { id: 'evolucion', icon: <LineChart size={18} />, label: 'Evolución' },
            ].map((vista) => (
              <button
                key={vista.id}
                onClick={() => setVistaActiva(vista.id)}
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-xl font-medium whitespace-nowrap flex-shrink-0 snap-start
                  transition-all duration-300 transform hover:scale-105
                  ${vistaActiva === vista.id
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : darkMode
                      ? 'text-gray-300 hover:bg-slate-700'
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
        {/* ==========================================
            NAVEGACIÓN DE MESES - Visible en todas las vistas
            ========================================== */}
        <div className={`flex items-center justify-between p-4 rounded-2xl shadow-lg ${
          darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border-2 border-gray-100'
        }`}>
          {/* Botón Mes Anterior */}
          <button
            onClick={() => cambiarMes('anterior')}
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
              darkMode ? 'bg-slate-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Mes Actual */}
          <div className="flex flex-col items-center gap-2">
            <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {obtenerNombreMes(mesVisible)}
            </span>

            {/* Botón "Hoy" - Solo visible si no estamos en el mes actual */}
            {mesVisible !== getMesActual() && (
              <button
                onClick={() => setMesVisible(getMesActual())}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Hoy
              </button>
            )}
          </div>

          {/* Botón Mes Siguiente */}
          <button
            onClick={() => cambiarMes('siguiente')}
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
              darkMode ? 'bg-slate-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* ==========================================
            INDICADOR DE HISTORIAL
            ========================================== */}
        {/* Mostrar banner cuando se está viendo un mes diferente al actual */}
        {mesVisible !== getMesActual() && (
          <div className={`p-4 rounded-2xl shadow-lg border-2 ${
            darkMode
              ? 'bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-700'
              : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300'
          }`}>
            <div className="flex items-center justify-center gap-3">
              <Calendar className={darkMode ? 'text-purple-400' : 'text-purple-600'} size={20} />
              <span className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                📅 Viendo historial: {obtenerNombreMes(mesVisible)}
              </span>
            </div>
          </div>
        )}

        {/* ==========================================
            WIDGET RESUMEN COMPACTO
            ========================================== */}
        {/* Widget colapsable (solo visible fuera de inicio) */}
        {mostrarWidget && vistaActiva !== 'inicio' && (
          <div className={`rounded-xl shadow-lg p-4 mb-4 animate-scaleUp transition-all duration-300 ${
            darkMode ? 'bg-slate-800/95 border border-slate-700' : 'bg-white/95 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-gray-600'}`}>
                Resumen {obtenerNombreMes(mesVisible)}
              </h3>
              <button
                onClick={() => setMostrarWidget(false)}
                className={`p-1 rounded hover:bg-opacity-10 transition-colors ${
                  darkMode ? 'hover:bg-white' : 'hover:bg-gray-500'
                }`}
                aria-label="Cerrar widget"
              >
                <X size={16} className={darkMode ? 'text-slate-300' : 'text-gray-500'} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Ingresos mini */}
              <div className="text-center">
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ingresos</div>
                <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {totalIngresos.toFixed(0)}€
                </div>
              </div>

              {/* Gastos mini */}
              <div className="text-center">
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gastos</div>
                <div className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {totalGastos.toFixed(0)}€
                </div>
              </div>

              {/* Balance mini */}
              <div className="text-center">
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Balance</div>
                <div className={`text-lg font-bold ${
                  saldoDisponible >= 0
                    ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                    : (darkMode ? 'text-orange-400' : 'text-orange-600')
                }`}>
                  {saldoDisponible >= 0 ? '+' : ''}{saldoDisponible.toFixed(0)}€
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botón para mostrar widget si está oculto */}
        {!mostrarWidget && vistaActiva !== 'inicio' && (
          <button
            onClick={() => setMostrarWidget(true)}
            className={`mb-4 text-sm font-medium flex items-center gap-1 transition-colors ${
              darkMode
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <Eye size={14} /> Mostrar resumen
          </button>
        )}

        {/* Vista: Inicio (Dashboard) */}
        {vistaActiva === 'inicio' && (
          <div className="animate-fadeInLeft">

        {/* ==========================================
            HERO SECTION PERSONALIZADO
            ========================================== */}
        <div className={`mb-6 relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
          darkMode
            ? 'bg-gradient-to-r from-blue-700 to-purple-700'
            : 'bg-gradient-to-r from-blue-600 to-purple-600'
        }`}>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              {(() => {
                const hora = new Date().getHours();
                if (hora < 12) return "☀️ Buenos días";
                if (hora < 20) return "🌤️ Buenas tardes";
                return "🌙 Buenas noches";
              })()}, {session?.user?.name?.split(' ')[0] || 'Usuario'}
            </h2>
            <p className="text-white/90 text-lg">
              {saldoDisponible >= 0
                ? `Tu balance es positivo: +${saldoDisponible.toFixed(2)}€`
                : `Atención: tienes un déficit de ${Math.abs(saldoDisponible).toFixed(2)}€`}
            </p>
            <p className="text-white/70 text-sm mt-2">
              {obtenerNombreMes(mesVisible)} • {ingresosMesActual.length} ingresos • {gastosMesActual.length} gastos registrados
            </p>
          </div>
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        </div>

        {/* ==========================================
            ALERTAS INTELIGENTES
            ========================================== */}
        {(() => {
          const alertas = [];

          // Alerta de déficit crítico
          if (saldoDisponible < 0) {
            alertas.push({
              tipo: 'error',
              icono: '⚠️',
              titulo: 'Déficit Detectado',
              mensaje: `Tienes un déficit de ${Math.abs(saldoDisponible).toFixed(2)}€. Revisa tus gastos.`
            });
          }

          // Alerta de gastos altos
          if (totalIngresos > 0 && totalGastos > totalIngresos * 0.9) {
            alertas.push({
              tipo: 'warning',
              icono: '💡',
              titulo: 'Gastos Elevados',
              mensaje: `Tus gastos representan el ${((totalGastos / totalIngresos) * 100).toFixed(0)}% de tus ingresos.`
            });
          }

          // Alerta de ahorro excelente
          if (totalIngresos > 0 && saldoDisponible > totalIngresos * 0.3) {
            alertas.push({
              tipo: 'success',
              icono: '🎉',
              titulo: '¡Excelente Ahorro!',
              mensaje: `Estás ahorrando más del 30% de tus ingresos (${((saldoDisponible / totalIngresos) * 100).toFixed(0)}%).`
            });
          }

          // Alerta de deuda alta
          if (deudaTotalCombinada > totalIngresos * 0.5 && totalIngresos > 0) {
            alertas.push({
              tipo: 'warning',
              icono: '🏦',
              titulo: 'Deuda Elevada',
              mensaje: `Tu deuda total (${deudaTotalCombinada.toFixed(2)}€) supera el 50% de tus ingresos mensuales.`
            });
          }

          // Alerta de sin gastos registrados
          if (totalGastos === 0 && totalIngresos > 0) {
            alertas.push({
              tipo: 'info',
              icono: '📝',
              titulo: 'Registra tus Gastos',
              mensaje: 'Aún no has registrado gastos este mes. ¡Mantén tu control financiero actualizado!'
            });
          }

          if (alertas.length === 0) return null;

          return (
            <div className="space-y-2 mb-6">
              {alertas.slice(0, 2).map((alerta, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl flex items-start gap-3 transition-all duration-300 animate-scaleUp border-2 ${
                    alerta.tipo === 'error'
                      ? darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                    : alerta.tipo === 'warning'
                      ? darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
                    : alerta.tipo === 'success'
                      ? darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                      : darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{alerta.icono}</span>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm mb-1 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {alerta.titulo}
                    </h4>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {alerta.mensaje}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ==========================================
            PANEL DE ACCIONES RÁPIDAS
            ========================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => {
              setVistaActiva('ingresos');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              darkMode
                ? 'bg-blue-900/20 border-2 border-blue-800 hover:bg-blue-900/30'
                : 'bg-blue-50 border-2 border-blue-100 hover:bg-blue-100'
            }`}
          >
            <Plus className={`mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
            <span className={`text-sm font-medium block ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              Añadir Ingreso
            </span>
          </button>

          <button
            onClick={() => {
              setVistaActiva('gastos');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              darkMode
                ? 'bg-red-900/20 border-2 border-red-800 hover:bg-red-900/30'
                : 'bg-red-50 border-2 border-red-100 hover:bg-red-100'
            }`}
          >
            <ShoppingCart className={`mx-auto mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`} size={24} />
            <span className={`text-sm font-medium block ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              Nuevo Gasto
            </span>
          </button>

          <button
            onClick={() => {
              setVistaActiva('ahorros');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              darkMode
                ? 'bg-green-900/20 border-2 border-green-800 hover:bg-green-900/30'
                : 'bg-green-50 border-2 border-green-100 hover:bg-green-100'
            }`}
          >
            <Target className={`mx-auto mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
            <span className={`text-sm font-medium block ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              Ahorros
            </span>
          </button>
        </div>

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
            <div className="flex items-center justify-start gap-2">
              {saldoDisponible >= 0 ? (
                <TrendingUp className="text-white" size={28} />
              ) : (
                <TrendingDown className="text-white" size={28} />
              )}
              <p className="text-white text-3xl font-bold">{saldoDisponible.toFixed(2)} €</p>
            </div>
          </div>
          <div className={`p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${darkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
            <p className="text-white/80 text-sm font-medium mb-2">🏦 Deuda Total</p>
            <p className="text-white text-3xl font-bold">{deudaTotalCombinada.toFixed(2)} €</p>
            <div className="mt-2 space-y-0.5 text-xs text-white/70">
              <div className="flex justify-between">
                <span>Deudas:</span>
                <span className="font-medium">{totalDeudas.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>Préstamos:</span>
                <span className="font-medium">{totalPrestamos.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparación con mes anterior */}
        {(() => {
          const comp = obtenerComparacionMensual(mesVisible);
          if (!comp.hayDatos) return null;

          return (
            <div className={`rounded-2xl shadow-xl p-6 backdrop-blur transition-all duration-300 ${
              darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white/95'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <TrendingUp className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={20} />
                Comparación con {comp.mesAnterior}
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Ingresos */}
                <div className={`p-4 rounded-xl transition-all duration-300 ${
                  darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ingresos</span>
                    <div className={`flex items-center gap-1 ${comp.difIngresos >= 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                      {comp.difIngresos >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span className="font-bold">{Math.abs(comp.porcIngresos).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {comp.ingresosActual.toFixed(2)} €
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {comp.difIngresos >= 0 ? '+' : ''}{comp.difIngresos.toFixed(2)} € vs mes anterior
                  </div>
                </div>

                {/* Gastos */}
                <div className={`p-4 rounded-xl transition-all duration-300 ${
                  darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Gastos</span>
                    <div className={`flex items-center gap-1 ${comp.difGastos <= 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                      {comp.difGastos > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span className="font-bold">{Math.abs(comp.porcGastos).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                    {comp.gastosActual.toFixed(2)} €
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {comp.difGastos >= 0 ? '+' : ''}{comp.difGastos.toFixed(2)} € vs mes anterior
                  </div>
                </div>
              </div>

              {/* Mensaje interpretativo */}
              <div className={`mt-4 p-3 rounded-lg transition-all duration-300 ${
                darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50'
              }`}>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  {comp.difGastos > comp.difIngresos ? (
                    <span>⚠️ <strong>Atención:</strong> Tus gastos aumentaron más que tus ingresos este mes</span>
                  ) : comp.difGastos < 0 && comp.difIngresos >= 0 ? (
                    <span>✓ <strong>¡Excelente!</strong> Aumentaste ingresos y redujiste gastos</span>
                  ) : comp.difGastos < 0 ? (
                    <span>✓ <strong>Bien hecho:</strong> Redujiste tus gastos este mes</span>
                  ) : (
                    <span>📊 Este mes tus finanzas son similares al mes anterior</span>
                  )}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Salud Financiera - Regla 50/30/20 */}
        <div className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
            💪 Salud Financiera (Regla 50/30/20)
          </h3>

          {(() => {
            // Calcular porcentajes reales (respecto a ingresos totales)
            const porcNecesidades = totalIngresos > 0 ? (totalGastosFijos / totalIngresos) * 100 : 0;
            const porcDeseos = totalIngresos > 0 ? (totalGastosVariables / totalIngresos) * 100 : 0;
            // Usar las cuentas de ahorro manuales, no el balance
            const ahorroReal = totalAhorros;
            const porcAhorro = totalIngresos > 0 ? (ahorroReal / totalIngresos) * 100 : 0;

            // Objetivos ideales
            const necesidadesIdeal = 50;
            const deseosIdeal = 30;
            const ahorroIdeal = 20;

            // Calcular anchos de barra (relativo al objetivo, máximo 100%)
            // La barra se llena al 100% cuando alcanzas el objetivo
            const anchoBarraNecesidades = Math.min((porcNecesidades / necesidadesIdeal) * 100, 100);
            const anchoBarraDeseos = Math.min((porcDeseos / deseosIdeal) * 100, 100);
            const anchoBarraAhorro = Math.min((porcAhorro / ahorroIdeal) * 100, 100);

            // Determinar si cumple cada categoría
            const cumpleNecesidades = porcNecesidades <= necesidadesIdeal;
            const cumpleDeseos = porcDeseos <= deseosIdeal;
            const cumpleAhorro = porcAhorro >= ahorroIdeal;
            const cumpleTodo = cumpleNecesidades && cumpleDeseos && cumpleAhorro;

            return (
              <div className="space-y-4">
                {/* Necesidades (Gastos Fijos) */}
                <div>
                  <div className={`flex justify-between text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>🏠 Necesidades (objetivo: máx {necesidadesIdeal}%)</span>
                    <span className="font-bold">{porcNecesidades.toFixed(0)}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full transition-all duration-500 ${
                        cumpleNecesidades ? 'bg-green-500' :
                        porcNecesidades <= necesidadesIdeal + 10 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${anchoBarraNecesidades}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {totalGastosFijos.toFixed(2)} € en gastos fijos
                  </p>
                </div>

                {/* Deseos (Gastos Variables) */}
                <div>
                  <div className={`flex justify-between text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>🎉 Deseos (objetivo: máx {deseosIdeal}%)</span>
                    <span className="font-bold">{porcDeseos.toFixed(0)}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full transition-all duration-500 ${
                        cumpleDeseos ? 'bg-green-500' :
                        porcDeseos <= deseosIdeal + 10 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${anchoBarraDeseos}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {totalGastosVariables.toFixed(2)} € en gastos variables
                  </p>
                </div>

                {/* Ahorro */}
                <div>
                  <div className={`flex justify-between text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>💰 Ahorro (objetivo: mín {ahorroIdeal}%)</span>
                    <span className="font-bold">{porcAhorro.toFixed(0)}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full transition-all duration-500 ${
                        cumpleAhorro ? 'bg-green-500' :
                        porcAhorro >= ahorroIdeal - 10 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${anchoBarraAhorro}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {ahorroReal.toFixed(2)} € en cuentas de ahorro
                  </p>
                </div>

                {/* Resumen unificado - Solo se muestra cuando TODO está bien */}
                {cumpleTodo && (
                  <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border-2 border-green-200'}`}>
                    <p className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      ✓ ¡Excelente! Sigues la regla 50/30/20 perfectamente
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
          </div>
        )}

        {/* Vista: Préstamos */}
        {vistaActiva === 'prestamos' && (
          <div className="animate-fadeInLeft">
          <LoanManager
            darkMode={darkMode}
            onCreateExpense={crearGastoAutomatico}
            onShowNotification={mostrarNotificacion}
          />
          </div>
        )}

        {/* Vista: Ingresos */}
        {vistaActiva === 'ingresos' && (
          <div className="animate-fadeInLeft">
            <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>✨ Añadir Ingreso</h2>
              <div className="flex gap-3 flex-wrap">
                <select
                  aria-label="tipo de ingreso"
                  value={nuevoIngreso.tipo}
                  onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, tipo: e.target.value })}
                  className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
                      : 'bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="Fijo">Fijo</option>
                  <option value="Variable">Variable</option>
                </select>
                <input
                  aria-label="concepto"
                  placeholder="Concepto"
                  value={nuevoIngreso.concepto}
                  onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, concepto: e.target.value })}
                  className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
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
                      ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
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
                      ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
                      : 'bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  onClick={añadirIngreso}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 min-h-[44px] rounded-xl font-semibold inline-flex items-center gap-3 shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <Plus size={20} /> Añadir
                </button>
              </div>
            </section>

            <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Ingresos</h2>
              {ingresosMesActual.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay ingresos registrados.</p>
              ) : (
                <ul className="space-y-3">
                  {ingresosMesActual.map((i) => (
                    <li key={i.id} className={`p-4 rounded-xl transition-all duration-300 ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                      {editandoIngreso === i.id ? (
                        // Modo edición
                        <div className="space-y-3">
                          <div className="flex gap-3 flex-wrap">
                            <input
                              placeholder="Concepto"
                              value={valoresTemp.concepto || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, concepto: e.target.value })}
                              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                            <input
                              placeholder="Monto"
                              value={valoresTemp.monto || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, monto: e.target.value })}
                              className={`w-32 px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                            <select
                              value={valoresTemp.tipo || 'Fijo'}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, tipo: e.target.value })}
                              className={`px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            >
                              <option value="Fijo">Fijo</option>
                              <option value="Variable">Variable</option>
                            </select>
                            <input
                              type="date"
                              value={valoresTemp.fecha || new Date().toISOString().split('T')[0]}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, fecha: e.target.value })}
                              className={`px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                          </div>
                          <div className="flex gap-3 justify-end">
                            <button
                              onClick={cancelarEdicionIngreso}
                              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              }`}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={guardarEdicionIngreso}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Modo visualización
                        <div className="flex justify-between items-center">
                          <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{i.concepto}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {i.tipo} {i.fecha && `• ${new Date(i.fecha).toLocaleDateString('es-ES')}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`font-bold text-lg ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{(i.monto || 0).toFixed(2)} €</div>
                            <button
                              onClick={() => iniciarEdicionIngreso(i)}
                              className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${
                                darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                              aria-label="Editar ingreso"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => eliminarIngreso(i.id)}
                              className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${
                                darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'
                              }`}
                              aria-label="Eliminar ingreso"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                Total ingresos: <strong className={darkMode ? 'text-green-400' : 'text-green-600'}>{totalIngresos.toFixed(2)} €</strong>
              </div>
            </section>
          </div>
        )}

        {/* Vista: Gastos Unificados con Filtros */}
        {vistaActiva === 'gastos' && (
          <div className="animate-fadeInLeft">
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Gastos</h2>

            {/* Filtros */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setTipoGastoActivo('todos')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  tipoGastoActivo === 'todos'
                    ? darkMode
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : darkMode
                    ? 'bg-slate-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Todos ({gastosMesActual.length})
              </button>
              <button
                onClick={() => setTipoGastoActivo('fijo')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  tipoGastoActivo === 'fijo'
                    ? darkMode
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                    : darkMode
                    ? 'bg-slate-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏠 Fijos ({gastosMesActual.filter(g => g.tipo === 'fijo').length})
              </button>
              <button
                onClick={() => setTipoGastoActivo('variable')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  tipoGastoActivo === 'variable'
                    ? darkMode
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : darkMode
                    ? 'bg-slate-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🛒 Variables ({gastosMesActual.filter(g => g.tipo === 'variable').length})
              </button>
            </div>

            {/* Formulario dinámico según tipo - Solo visible en Fijos o Variables */}
            {tipoGastoActivo === 'todos' ? (
              <div className={`mb-4 p-4 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border-2 border-blue-200'}`}>
                <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  ℹ️ Para añadir un gasto, selecciona primero si es <strong>Fijo</strong> o <strong>Variable</strong> usando los botones de arriba.
                </p>
              </div>
            ) : (
              <div className="flex gap-3 flex-wrap mb-4">
                {tipoGastoActivo === 'variable' && (
                  <>
                    <input
                      type="date"
                      value={nuevoGasto.fecha}
                      onChange={(e) => setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })}
                      className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                        darkMode
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                          : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
                      }`}
                    />
                    <select
                      value={nuevoGasto.categoria}
                      onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}
                      className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                        darkMode
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-orange-500 focus:ring-orange-500/20'
                          : 'bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20'
                      }`}
                    >
                      {CATEGORIAS_GASTOS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </>
                )}
                {tipoGastoActivo === 'fijo' && (
                  <select
                    value={nuevoGasto.categoria}
                    onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}
                    className={`w-40 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                      darkMode
                        ? 'bg-slate-700 border-slate-600 text-white focus:border-red-500 focus:ring-red-500/20'
                        : 'bg-white border-gray-200 focus:border-red-500 focus:ring-red-500/20'
                    }`}
                  >
                    {CATEGORIAS_GASTOS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
                <input
                  placeholder="Concepto"
                  value={nuevoGasto.concepto}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
                  className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                    darkMode
                      ? `bg-slate-700 border-slate-600 text-white ${tipoGastoActivo === 'fijo' ? 'focus:border-red-500 focus:ring-red-500/20' : 'focus:border-orange-500 focus:ring-orange-500/20'}`
                      : `bg-white border-gray-200 ${tipoGastoActivo === 'fijo' ? 'focus:border-red-500 focus:ring-red-500/20' : 'focus:border-orange-500 focus:ring-orange-500/20'}`
                  }`}
                />
                <input
                  placeholder="Monto"
                  value={nuevoGasto.monto}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
                  className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                    darkMode
                      ? `bg-slate-700 border-slate-600 text-white ${tipoGastoActivo === 'fijo' ? 'focus:border-red-500 focus:ring-red-500/20' : 'focus:border-orange-500 focus:ring-orange-500/20'}`
                      : `bg-white border-gray-200 ${tipoGastoActivo === 'fijo' ? 'focus:border-red-500 focus:ring-red-500/20' : 'focus:border-orange-500 focus:ring-orange-500/20'}`
                  }`}
                />
                <button
                  onClick={añadirGasto}
                  className={`${
                    tipoGastoActivo === 'fijo'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                  } text-white px-6 py-3 min-h-[44px] rounded-xl font-semibold inline-flex items-center gap-3 shadow-lg transform hover:scale-105 transition-all duration-300`}
                >
                  <Plus size={20} /> Añadir
                </button>
              </div>
            )}

            {/* Lista filtrada según tipo activo */}
            {(() => {
              const gastosFiltrados = tipoGastoActivo === 'todos'
                ? gastosMesActual
                : gastosMesActual.filter(g => g.tipo === tipoGastoActivo);

              return gastosFiltrados.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No hay {tipoGastoActivo === 'todos' ? 'gastos' : tipoGastoActivo === 'fijo' ? 'gastos fijos' : 'gastos variables'} registrados.
                </p>
              ) : (
                <ul className="space-y-3">
                  {gastosFiltrados.map((g) => (
                  <li key={g.id} className={`p-4 rounded-xl transition-all duration-300 ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                    {editandoGasto === g.id ? (
                      // Modo edición
                      <div className="space-y-3">
                        <div className="flex gap-3 flex-wrap">
                          <input
                            placeholder="Concepto"
                            value={valoresTemp.concepto || ''}
                            onChange={(e) => setValoresTemp({ ...valoresTemp, concepto: e.target.value })}
                            className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border-2 ${
                              darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                            }`}
                          />
                          <input
                            placeholder="Monto"
                            value={valoresTemp.monto || ''}
                            onChange={(e) => setValoresTemp({ ...valoresTemp, monto: e.target.value })}
                            className={`w-32 px-3 py-2 rounded-lg border-2 ${
                              darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                            }`}
                          />
                          <select
                            value={valoresTemp.categoria || 'Otros'}
                            onChange={(e) => setValoresTemp({ ...valoresTemp, categoria: e.target.value })}
                            className={`px-3 py-2 rounded-lg border-2 ${
                              darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                            }`}
                          >
                            {CATEGORIAS_GASTOS.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          {g.tipo === 'variable' && (
                            <input
                              type="date"
                              value={valoresTemp.fecha || new Date().toISOString().split('T')[0]}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, fecha: e.target.value })}
                              className={`px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={cancelarEdicionGasto}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={guardarEdicionGasto}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo visualización
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{g.concepto}</div>
                            {tipoGastoActivo === 'todos' && (
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                g.tipo === 'fijo'
                                  ? darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                                  : darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {g.tipo === 'fijo' ? '🏠 Fijo' : '🛒 Variable'}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {g.categoria && <span className="font-semibold">{g.categoria}</span>}
                            {g.categoria && g.fecha && ' • '}
                            {g.fecha && `📅 ${g.fecha}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`font-bold text-lg ${
                            g.tipo === 'fijo'
                              ? darkMode ? 'text-red-400' : 'text-red-600'
                              : darkMode ? 'text-orange-400' : 'text-orange-600'
                          }`}>
                            {(g.monto || 0).toFixed(2)} €
                          </div>
                          <button
                            onClick={() => iniciarEdicionGasto(g)}
                            className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${
                              darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            aria-label="Editar gasto"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => eliminarGasto(g.id)}
                            className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${
                              darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'
                            }`}
                            aria-label="Eliminar gasto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                  ))}
                </ul>
              );
            })()}

            {/* Resumen por categoría (incluye fijos y variables) */}
            {gastosMesActual.length > 0 && (
              <div className="mt-6">
                <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Resumen por Categoría</h3>
                <div className={`overflow-hidden rounded-xl border-2 ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-slate-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Categoría</th>
                        <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Fijos</th>
                        <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Variables</th>
                        <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total</th>
                        <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>%</th>
                      </tr>
                    </thead>
                    <tbody className={darkMode ? 'bg-slate-800' : 'bg-white'}>
                      {(() => {
                        const categorias = {};

                        // Agregar solo los gastos del mes actual
                        gastosMesActual.forEach(g => {
                          const categoria = g.categoria || 'Otros';
                          if (!categorias[categoria]) {
                            categorias[categoria] = { fijos: 0, variables: 0 };
                          }
                          if (g.tipo === 'fijo') {
                            categorias[categoria].fijos += parseFloat(g.monto) || 0;
                          } else {
                            categorias[categoria].variables += parseFloat(g.monto) || 0;
                          }
                        });

                        const totalGastos = totalGastosFijos + totalGastosVariables;

                        return Object.entries(categorias)
                          .map(([categoria, { fijos, variables }]) => ({
                            categoria,
                            fijos,
                            variables,
                            total: fijos + variables
                          }))
                          .sort((a, b) => b.total - a.total)
                          .map(({ categoria, fijos, variables, total }) => {
                            const porcentaje = totalGastos > 0 ? (total / totalGastos) * 100 : 0;
                            return (
                              <tr key={categoria} className={`border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                                <td className={`px-4 py-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{categoria}</td>
                                <td className={`px-4 py-3 text-right ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  {fijos > 0 ? fijos.toFixed(2) + '€' : '-'}
                                </td>
                                <td className={`px-4 py-3 text-right ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                  {variables > 0 ? variables.toFixed(2) + '€' : '-'}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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

            {/* Total según filtro activo */}
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              {tipoGastoActivo === 'todos' ? (
                <div className="space-y-2 text-sm">
                  <div className={`flex justify-between ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>Total gastos fijos:</span>
                    <strong className={darkMode ? 'text-red-400' : 'text-red-600'}>{totalGastosFijos.toFixed(2)} €</strong>
                  </div>
                  <div className={`flex justify-between ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>Total gastos variables:</span>
                    <strong className={darkMode ? 'text-orange-400' : 'text-orange-600'}>{totalGastosVariables.toFixed(2)} €</strong>
                  </div>
                  <div className={`flex justify-between font-bold text-base pt-2 border-t ${darkMode ? 'border-slate-700 text-white' : 'border-gray-200 text-gray-900'}`}>
                    <span>Total general:</span>
                    <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{totalGastos.toFixed(2)} €</span>
                  </div>
                </div>
              ) : tipoGastoActivo === 'fijo' ? (
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total gastos fijos: <strong className={darkMode ? 'text-red-400' : 'text-red-600'}>{totalGastosFijos.toFixed(2)} €</strong>
                </div>
              ) : (
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total gastos variables: <strong className={darkMode ? 'text-orange-400' : 'text-orange-600'}>{totalGastosVariables.toFixed(2)} €</strong>
                </div>
              )}
            </div>
          </section>
          </div>
        )}

        {/* Vista: Deudas */}
        {vistaActiva === 'deudas' && (
          <div className="animate-fadeInLeft">
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💳 Deudas</h2>
            <div className="flex gap-3 flex-wrap mb-4">
              <input
                placeholder="Nombre de la deuda"
                value={nuevaDeuda.nombre}
                onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, nombre: e.target.value })}
                className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                    : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                }`}
              />
              <input
                placeholder="Monto Total"
                value={nuevaDeuda.montoTotal}
                onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, montoTotal: e.target.value })}
                className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                    : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                }`}
              />
              <input
                placeholder="Plazo (meses)"
                value={nuevaDeuda.plazoMeses}
                onChange={(e) => setNuevaDeuda({ ...nuevaDeuda, plazoMeses: e.target.value })}
                className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-purple-500 focus:ring-purple-500/20'
                    : 'bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                }`}
              />
              <button onClick={añadirDeuda} className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 min-h-[44px] rounded-xl font-semibold inline-flex items-center gap-3 shadow-lg transform hover:scale-105 transition-all duration-300">
                <Plus size={20} /> Añadir
              </button>
            </div>
            {deudasMesActual.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay deudas registradas.</p>
            ) : (
              <ul className="space-y-4">
                {deudasMesActual.map((d) => {
                  const montoTotal = d.montoTotal || d.monto || 0;
                  const totalPagado = d.totalPagado || 0;
                  const restante = montoTotal - totalPagado;
                  const progreso = montoTotal > 0 ? (totalPagado / montoTotal) * 100 : 0;
                  const cuotaMensual = d.cuotaMensual || (montoTotal / (d.plazoMeses || 1));

                  return (
                    <li key={d.id} className={`p-5 rounded-xl transition-all duration-300 ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                      {editandoDeuda === d.id ? (
                        // Modo edición
                        <div className="space-y-3">
                          <div className="flex gap-3 flex-wrap">
                            <input
                              placeholder="Nombre de la deuda"
                              value={valoresTemp.nombre || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, nombre: e.target.value })}
                              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                            <input
                              placeholder="Monto total"
                              value={valoresTemp.montoTotal || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, montoTotal: e.target.value })}
                              className={`w-32 px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                            <input
                              placeholder="Plazo (meses)"
                              value={valoresTemp.plazoMeses || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, plazoMeses: e.target.value })}
                              className={`w-32 px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                            <input
                              placeholder="Cuota mensual"
                              value={valoresTemp.cuotaMensual || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, cuotaMensual: e.target.value })}
                              className={`w-32 px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                            <input
                              type="date"
                              placeholder="Fecha fin"
                              value={valoresTemp.fechaFin || ''}
                              onChange={(e) => setValoresTemp({ ...valoresTemp, fechaFin: e.target.value })}
                              className={`px-3 py-2 rounded-lg border-2 ${
                                darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                              }`}
                            />
                          </div>
                          <div className="flex gap-3 justify-end">
                            <button
                              onClick={cancelarEdicionDeuda}
                              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              }`}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={guardarEdicionDeuda}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Modo visualización
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{d.nombre}</div>
                              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Cuota: <span className="font-semibold">{cuotaMensual.toFixed(2)}€/mes</span>
                                {d.plazoMeses && ` • ${d.plazoMeses} meses`}
                                {d.fechaFin && d.fechaFin !== 'Sin definir' && ` • Fin: ${new Date(d.fechaFin).toLocaleDateString('es-ES')}`}
                                {(!d.fechaFin || d.fechaFin === 'Sin definir') && !d.plazoMeses && (
                                  <span className="text-xs ml-2">(Sin plazo definido)</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => iniciarEdicionDeuda(d)}
                                className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${
                                  darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                aria-label="Editar deuda"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => eliminarDeuda(d.id)}
                                className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${
                                  darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'
                                }`}
                                aria-label="Eliminar deuda"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
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
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
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
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 min-h-[44px] rounded-lg font-semibold inline-flex items-center gap-3 shadow-md transform hover:scale-105 transition-all duration-300"
                              >
                                <DollarSign size={18} /> Registrar Pago
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Total deudas: <strong className={darkMode ? 'text-purple-400' : 'text-purple-600'}>{totalDeudas.toFixed(2)} €</strong>
            </div>
          </section>
          </div>
        )}

        {/* Vista: Mis Ahorros */}
        {vistaActiva === 'objetivos' && (
          <div className="animate-fadeInLeft">
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Mis Ahorros</h2>
            <div className="flex gap-3 flex-wrap mb-4">
              <input
                placeholder="Nombre de la cuenta"
                value={nuevaCuentaAhorro.nombre}
                onChange={(e) => setNuevaCuentaAhorro({ ...nuevaCuentaAhorro, nombre: e.target.value })}
                className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                    : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
                }`}
              />
              <input
                placeholder="Saldo"
                value={nuevaCuentaAhorro.saldo}
                onChange={(e) => setNuevaCuentaAhorro({ ...nuevaCuentaAhorro, saldo: e.target.value })}
                className={`w-32 px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-teal-500 focus:ring-teal-500/20'
                    : 'bg-white border-gray-200 focus:border-teal-500 focus:ring-teal-500/20'
                }`}
              />
              <button onClick={añadirCuentaAhorro} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-3 min-h-[44px] rounded-xl font-semibold inline-flex items-center gap-3 shadow-lg transform hover:scale-105 transition-all duration-300">
                <Plus size={20} /> Añadir
              </button>
            </div>
            {cuentasAhorro.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay cuentas de ahorro registradas.</p>
            ) : (
              <ul className="space-y-4">
                {cuentasAhorro.map((c) => (
                  <li key={c.id} className={`p-5 rounded-xl transition-all duration-300 hover:scale-[1.01] ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'} border-2`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.nombre}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cuenta de ahorro</div>
                      </div>
                      <button
                        onClick={() => eliminarCuentaAhorro(c.id)}
                        className={`p-3 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                        aria-label="Eliminar objetivo de ahorro"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className={`text-3xl font-bold mb-4 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                      {(c.saldo || 0).toFixed(2)} €
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => añadirDineroCuenta(c.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 min-h-[44px] rounded-lg font-semibold inline-flex items-center justify-center gap-3 shadow-md transform hover:scale-105 transition-all duration-300"
                      >
                        <Plus size={18} /> Añadir
                      </button>
                      <button
                        onClick={() => retirarDineroCuenta(c.id)}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 min-h-[44px] rounded-lg font-semibold inline-flex items-center justify-center gap-3 shadow-md transform hover:scale-105 transition-all duration-300"
                      >
                        <Download size={18} /> Retirar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={`mt-4 pt-4 border-t text-sm ${darkMode ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Total ahorros: <strong className={darkMode ? 'text-teal-400' : 'text-teal-600'}>{totalAhorros.toFixed(2)} €</strong>
            </div>
          </section>
          </div>
        )}

        {/* Vista: Evolución Temporal */}
        {vistaActiva === 'evolucion' && (
          <div className="animate-fadeInLeft">
          <section className={`p-6 rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="mb-6">
              <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📈 Evolución Temporal
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Análisis histórico de tus finanzas a lo largo del tiempo
              </p>
            </div>

            {(() => {
              const datosHistoricos = obtenerDatosHistoricos();

              if (datosHistoricos.length === 0) {
                return (
                  <div className={`p-12 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <LineChart className={`mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={64} />
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Sin datos históricos
                    </h3>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Guarda el mes actual para empezar a ver tu evolución temporal
                    </p>
                  </div>
                );
              }

              // Calcular valores máximos para escalar el gráfico
              const maxValor = Math.max(...datosHistoricos.map(m => Math.max(m.ingresos, m.gastos)));
              const altura = 320;

              return (
                <>
                  {/* Estadísticas resumidas en cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className={`p-5 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-400 to-green-500'}`}>
                      <p className="text-white/80 text-xs font-medium mb-1">💰 Total Ingresos</p>
                      <p className="text-white text-2xl font-bold">
                        {datosHistoricos.reduce((sum, m) => sum + m.ingresos, 0).toFixed(2)} €
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        {datosHistoricos.length} {datosHistoricos.length === 1 ? 'mes' : 'meses'}
                      </p>
                    </div>

                    <div className={`p-5 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-red-400 to-red-500'}`}>
                      <p className="text-white/80 text-xs font-medium mb-1">💸 Total Gastos</p>
                      <p className="text-white text-2xl font-bold">
                        {datosHistoricos.reduce((sum, m) => sum + m.gastos, 0).toFixed(2)} €
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        Promedio: {(datosHistoricos.reduce((sum, m) => sum + m.gastos, 0) / datosHistoricos.length).toFixed(2)} €/mes
                      </p>
                    </div>

                    <div className={`p-5 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
                      <p className="text-white/80 text-xs font-medium mb-1">💵 Balance Total</p>
                      <p className="text-white text-2xl font-bold">
                        {datosHistoricos.reduce((sum, m) => sum + m.balance, 0).toFixed(2)} €
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        {datosHistoricos.filter(m => m.balance > 0).length} {datosHistoricos.filter(m => m.balance > 0).length === 1 ? 'mes positivo' : 'meses positivos'}
                      </p>
                    </div>

                    <div className={`p-5 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
                      <p className="text-white/80 text-xs font-medium mb-1">📊 Promedio Mensual</p>
                      <p className="text-white text-2xl font-bold">
                        {(datosHistoricos.reduce((sum, m) => sum + m.ingresos, 0) / datosHistoricos.length).toFixed(2)} €
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        Ingresos promedio
                      </p>
                    </div>
                  </div>

                  {/* Gráfico de líneas mejorado */}
                  <div className={`p-6 rounded-xl mb-6 ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      📊 Tendencia: Ingresos vs Gastos
                    </h3>

                    <div className="relative" style={{ height: altura + 60 + 'px' }}>
                      {/* Líneas del gráfico */}
                      <svg className="w-full" style={{ height: altura + 'px' }}>
                        {/* Líneas de referencia horizontales */}
                        {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                          const y = altura - factor * (altura - 40);
                          return (
                            <g key={i}>
                              <line
                                x1="0%"
                                y1={y}
                                x2="100%"
                                y2={y}
                                stroke={darkMode ? '#374151' : '#e5e7eb'}
                                strokeWidth="1"
                                strokeDasharray="5,5"
                              />
                              <text
                                x="0"
                                y={y - 5}
                                fill={darkMode ? '#9ca3af' : '#6b7280'}
                                fontSize="10"
                              >
                                {(maxValor * factor).toFixed(0)}€
                              </text>
                            </g>
                          );
                        })}

                        {/* Línea de ingresos */}
                        <polyline
                          points={datosHistoricos.map((mes, i) => {
                            const x = (i / (datosHistoricos.length - 1)) * 100;
                            const y = altura - (mes.ingresos / maxValor) * (altura - 40);
                            return `${x}%,${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke={darkMode ? '#4ade80' : '#22c55e'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Línea de gastos */}
                        <polyline
                          points={datosHistoricos.map((mes, i) => {
                            const x = (i / (datosHistoricos.length - 1)) * 100;
                            const y = altura - (mes.gastos / maxValor) * (altura - 40);
                            return `${x}%,${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke={darkMode ? '#f87171' : '#ef4444'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Puntos de ingresos con hover */}
                        {datosHistoricos.map((mes, i) => {
                          const x = (i / (datosHistoricos.length - 1)) * 100;
                          const y = altura - (mes.ingresos / maxValor) * (altura - 40);
                          return (
                            <g key={`ing-${i}`}>
                              <circle
                                cx={`${x}%`}
                                cy={y}
                                r="6"
                                fill={darkMode ? '#4ade80' : '#22c55e'}
                                stroke={darkMode ? '#1e293b' : '#ffffff'}
                                strokeWidth="2"
                                className="hover:r-8 transition-all cursor-pointer"
                              />
                            </g>
                          );
                        })}

                        {/* Puntos de gastos con hover */}
                        {datosHistoricos.map((mes, i) => {
                          const x = (i / (datosHistoricos.length - 1)) * 100;
                          const y = altura - (mes.gastos / maxValor) * (altura - 40);
                          return (
                            <g key={`gas-${i}`}>
                              <circle
                                cx={`${x}%`}
                                cy={y}
                                r="6"
                                fill={darkMode ? '#f87171' : '#ef4444'}
                                stroke={darkMode ? '#1e293b' : '#ffffff'}
                                strokeWidth="2"
                                className="hover:r-8 transition-all cursor-pointer"
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Etiquetas de meses */}
                      <div className="flex justify-between mt-2">
                        {datosHistoricos.map((mes, i) => (
                          <span
                            key={i}
                            className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                            style={{
                              width: `${100 / datosHistoricos.length}%`,
                              textAlign: i === 0 ? 'left' : i === datosHistoricos.length - 1 ? 'right' : 'center'
                            }}
                          >
                            {mes.nombreMes.split(' ')[0].substring(0, 3)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Leyenda mejorada */}
                    <div className="flex gap-6 justify-center mt-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${darkMode ? 'bg-green-400' : 'bg-green-500'}`}></div>
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ingresos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${darkMode ? 'bg-red-400' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gastos</span>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de historial mensual mejorada */}
                  <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      📅 Detalle Mensual
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={`border-b-2 ${darkMode ? 'border-slate-600' : 'border-gray-300'}`}>
                            <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Mes
                            </th>
                            <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Ingresos
                            </th>
                            <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Gastos
                            </th>
                            <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Balance
                            </th>
                            <th className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              % Ahorro
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {datosHistoricos.map((mes, index) => {
                            const porcentajeAhorro = mes.ingresos > 0 ? ((mes.balance / mes.ingresos) * 100) : 0;
                            return (
                              <tr
                                key={index}
                                className={`border-b ${darkMode ? 'border-slate-700 hover:bg-slate-700/30' : 'border-gray-200 hover:bg-gray-100'} transition-colors`}
                              >
                                <td className={`px-4 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {mes.nombreMes}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  +{mes.ingresos.toFixed(2)} €
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  -{mes.gastos.toFixed(2)} €
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${mes.balance >= 0 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                                  {mes.balance >= 0 ? '+' : ''}{mes.balance.toFixed(2)} €
                                </td>
                                <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                    porcentajeAhorro >= 20
                                      ? darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'
                                      : porcentajeAhorro >= 10
                                      ? darkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                      : porcentajeAhorro >= 0
                                      ? darkMode ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700'
                                      : darkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {porcentajeAhorro.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Insights adicionales */}
                    <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-600' : 'border-gray-300'}`}>
                      <h4 className={`text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        💡 Análisis
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mejor mes</p>
                          <p className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {(() => {
                              const mejorMes = datosHistoricos.reduce((max, mes) => mes.balance > max.balance ? mes : max);
                              return `${mejorMes.nombreMes.split(' ')[0]} (+${mejorMes.balance.toFixed(2)}€)`;
                            })()}
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mayor gasto</p>
                          <p className={`font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {(() => {
                              const mayorGasto = datosHistoricos.reduce((max, mes) => mes.gastos > max.gastos ? mes : max);
                              return `${mayorGasto.nombreMes.split(' ')[0]} (-${mayorGasto.gastos.toFixed(2)}€)`;
                            })()}
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tendencia general</p>
                          <p className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {(() => {
                              const primerBalance = datosHistoricos[0].balance;
                              const ultimoBalance = datosHistoricos[datosHistoricos.length - 1].balance;
                              const tendencia = ultimoBalance > primerBalance ? '📈 Mejorando' : ultimoBalance < primerBalance ? '📉 Descendiendo' : '➡️ Estable';
                              return tendencia;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
          </div>
        )}

</main>
    </div>
  );
}
