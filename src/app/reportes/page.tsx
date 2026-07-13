"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Wallet, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { reporteService } from "@/services/databaseService";

interface Pago {
  id: string;
  prestamo_id: string;
  monto_pagado: number;
  capital_abonado: number;
  interes_pagado: number;
  numero_cuota: number;
  fecha_pago: string;
  metodo_pago: string;
}

interface MonthlyData {
  mes: string;
  año: number;
  mesNumero: number;
  totalRecuperado: number;
  capitalAbonado: number;
  interesPagado: number;
  cantidadPagos: number;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function ReportesPage() {
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear());

  const { data: session } = useAuth();

  const { data: config } = useQuery({
    queryKey: ["capital-config-reportes", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const data = await reporteService.getDiaCorte(session!.id);
      return data;
    }
  });

  const diaCorte = config?.dia_corte_kpi || 1;

  const { data: pagos = [], isLoading: loading } = useQuery({
    queryKey: ["pagos-reportes", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const data = await reporteService.getAllPagos(session!.id);
      return data as Pago[];
    },
  });

  // Calcular datos mensuales respetando la fecha de corte
  const datosMenuales = useMemo(() => {
    const meses: { [key: string]: MonthlyData } = {};

    pagos.forEach((pago) => {
      const fecha = new Date(pago.fecha_pago);
      
      // Determinar mes y año según el día de corte
      const dia = fecha.getDate();
      let mes = fecha.getMonth();
      let anio = fecha.getFullYear();

      if (dia >= diaCorte) {
        mes += 1;
        if (mes > 11) {
          mes = 0;
          anio += 1;
        }
      }

      const clave = `${anio}-${mes}`;

      if (!meses[clave]) {
        meses[clave] = {
          mes: MESES[mes],
          año: anio,
          mesNumero: mes,
          totalRecuperado: 0,
          capitalAbonado: 0,
          interesPagado: 0,
          cantidadPagos: 0,
        };
      }

      meses[clave].totalRecuperado += pago.monto_pagado;
      meses[clave].capitalAbonado += pago.capital_abonado;
      meses[clave].interesPagado += pago.interes_pagado;
      meses[clave].cantidadPagos += 1;
    });

    return Object.values(meses).sort((a, b) => {
      if (a.año !== b.año) return a.año - b.año;
      return a.mesNumero - b.mesNumero;
    });
  }, [pagos, diaCorte]);

  // Datos del mes seleccionado
  const mesActual = datosMenuales.find(
    (d) => d.mesNumero === mesSeleccionado && d.año === anioSeleccionado
  );

  // Datos acumulados del año
  const datosAnioActual = useMemo(() => {
    return datosMenuales.filter((d) => d.año === anioSeleccionado);
  }, [datosMenuales, anioSeleccionado]);

  // Totales del año
  const totalAnio = useMemo(() => {
    return {
      totalRecuperado: datosAnioActual.reduce((sum, d) => sum + d.totalRecuperado, 0),
      capitalAbonado: datosAnioActual.reduce((sum, d) => sum + d.capitalAbonado, 0),
      interesPagado: datosAnioActual.reduce((sum, d) => sum + d.interesPagado, 0),
      cantidadPagos: datosAnioActual.reduce((sum, d) => sum + d.cantidadPagos, 0),
    };
  }, [datosAnioActual]);
  const handleMesAnterior = () => {
    if (mesSeleccionado === 0) {
      setMesSeleccionado(11);
      setAnioSeleccionado(anioSeleccionado - 1);
    } else {
      setMesSeleccionado(mesSeleccionado - 1);
    }
  };

  const handleMesSiguiente = () => {
    if (mesSeleccionado === 11) {
      setMesSeleccionado(0);
      setAnioSeleccionado(anioSeleccionado + 1);
    } else {
      setMesSeleccionado(mesSeleccionado + 1);
    }
  };

  // Obtener max para escala de barras
  const maxValor = Math.max(
    ...datosAnioActual.map((d) => d.totalRecuperado),
    1
  );

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-6 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Reportes</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Análisis de cobros e intereses</p>
            </div>
          </div>
        </header>

        {/* Resumen del Año */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider pl-1">
            Resumen de {anioSeleccionado}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 p-4 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                <Wallet size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Capital Recuperado</span>
              </div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300">{formatCurrency(totalAnio.capitalAbonado)}</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">{totalAnio.cantidadPagos} pagos</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-500/5 border border-orange-200 dark:border-orange-500/20 p-4 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-2">
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Interés Neto</span>
              </div>
              <div className="text-xl font-bold text-orange-900 dark:text-orange-300">{formatCurrency(totalAnio.interesPagado)}</div>
              <div className="text-xs text-orange-700 dark:text-orange-400 mt-2">Ganancia obtenida</div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-500/10 dark:to-teal-500/5 border border-teal-200 dark:border-teal-500/20 p-4 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 mb-2">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Total Recuperado</span>
            </div>
            <div className="text-2xl font-bold text-teal-900 dark:text-teal-300">{formatCurrency(totalAnio.totalRecuperado)}</div>
          </div>
        </section>

        {/* Selector de Mes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Análisis Mensual
            </h2>
            <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1">
              <button
                onClick={handleMesAnterior}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-white/10 rounded transition-colors"
              >
                <ChevronLeft size={16} className="text-zinc-600 dark:text-zinc-400" />
              </button>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white min-w-[120px] text-center">
                {MESES[mesSeleccionado]} {anioSeleccionado}
              </span>
              <button
                onClick={handleMesSiguiente}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-white/10 rounded transition-colors"
              >
                <ChevronRight size={16} className="text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Datos del Mes Seleccionado */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : mesActual ? (
            <div className="space-y-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none">
              {/* KPIs del Mes */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5">
                <div className="flex xs:flex-col justify-between xs:justify-center items-center p-3 xs:py-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl text-center transition-colors">
                  <span className="text-[10px] xs:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider xs:mb-1">Recuperado</span>
                  <span className="text-sm xs:text-base font-black text-teal-600 dark:text-teal-400 truncate max-w-[150px] xs:max-w-none">
                    {formatCurrency(mesActual.totalRecuperado)}
                  </span>
                </div>
                <div className="flex xs:flex-col justify-between xs:justify-center items-center p-3 xs:py-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl text-center transition-colors">
                  <span className="text-[10px] xs:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider xs:mb-1">Capital</span>
                  <span className="text-sm xs:text-base font-black text-emerald-600 dark:text-emerald-400 truncate max-w-[150px] xs:max-w-none">
                    {formatCurrency(mesActual.capitalAbonado)}
                  </span>
                </div>
                <div className="flex xs:flex-col justify-between xs:justify-center items-center p-3 xs:py-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl text-center transition-colors">
                  <span className="text-[10px] xs:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider xs:mb-1">Interés</span>
                  <span className="text-sm xs:text-base font-black text-orange-600 dark:text-orange-400 truncate max-w-[150px] xs:max-w-none">
                    {formatCurrency(mesActual.interesPagado)}
                  </span>
                </div>
              </div>

              {/* Barras Visuales */}
              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-white/10">
                {/* Barra Total Recuperado */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">Total Recuperado</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(mesActual.totalRecuperado)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
                      style={{ width: `${(mesActual.totalRecuperado / maxValor) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Barra Capital Abonado */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">Capital Abonado</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(mesActual.capitalAbonado)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                      style={{ width: `${(mesActual.capitalAbonado / maxValor) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Barra Interés Pagado */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">Interés Neto</span>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(mesActual.interesPagado)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                      style={{ width: `${(mesActual.interesPagado / maxValor) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Información Adicional */}
              <div className="pt-4 border-t border-zinc-200 dark:border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">Cantidad de pagos:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{mesActual.cantidadPagos}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-zinc-600 dark:text-zinc-400">Promedio por pago:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(mesActual.totalRecuperado / mesActual.cantidadPagos)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
                <DollarSign size={24} className="text-zinc-400" />
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-1">No hay datos disponibles</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">para {MESES[mesSeleccionado]} de {anioSeleccionado}</p>
            </div>
          )}
        </section>

        {/* Gráfico de Años (Mini) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider pl-1">
            Tendencia Mensual de {anioSeleccionado}
          </h2>
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
            <div className="space-y-2">
              {datosAnioActual.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">Sin datos para este año</p>
                </div>
              ) : (
                datosAnioActual.map((mes) => (
                  <div key={`${mes.año}-${mes.mesNumero}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{mes.mes}</span>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(mes.totalRecuperado)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-teal-600"
                        style={{ width: `${(mes.totalRecuperado / maxValor) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
