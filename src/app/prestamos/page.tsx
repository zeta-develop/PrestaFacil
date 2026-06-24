"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, Search, Calendar, DollarSign, User, Filter, ChevronRight, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Prestamo {
  id: string;
  cliente_id: string;
  monto: number;
  saldo_pendiente: number;
  estado: "activo" | "pagado";
  fecha_inicio: string;
  fecha_fin?: string;
  porcentaje_interes: number;
  total_a_pagar: number;
  cuotas_pagadas: number;
  numero_cuotas: number;
  clientes: {
    nombre: string;
  };
}

type EstadoFiltro = "todos" | "activo" | "pagado";

export default function PrestamosPage() {
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: prestamos = [], isLoading: loading } = useQuery({
    queryKey: ["prestamos", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestamos")
        .select(`
          *,
          clientes ( nombre )
        `)
        .eq("user_id", session!.id)
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;
      return data as Prestamo[];
    },
  });

  // Filtrar préstamos
  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter((p) => {
      // Filtro por estado
      if (estadoFiltro !== "todos" && p.estado !== estadoFiltro) {
        return false;
      }

      // Filtro por búsqueda (cliente)
      if (search && !p.clientes.nombre.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Filtro por rango de fechas
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        const prestamInicio = new Date(p.fecha_inicio);
        if (prestamInicio < inicio) return false;
      }

      if (fechaFin) {
        const fin = new Date(fechaFin);
        const prestamFin = new Date(p.fecha_inicio);
        if (prestamFin > fin) return false;
      }

      return true;
    });
  }, [prestamos, estadoFiltro, search, fechaInicio, fechaFin]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-NI", {
      style: "currency",
      currency: "NIO",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getEstadoColor = (estado: string) => {
    return estado === "activo"
      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
      : "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400";
  };

  const getEstadoLabel = (estado: string) => {
    return estado === "activo" ? "Activo" : "Pagado";
  };

  // Estadísticas
  const stats = {
    total: prestamosFiltrados.length,
    activos: prestamosFiltrados.filter((p) => p.estado === "activo").length,
    pagados: prestamosFiltrados.filter((p) => p.estado === "pagado").length,
    montoPendiente: prestamosFiltrados.reduce((sum, p) => sum + p.saldo_pendiente, 0),
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-6 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Link href="/clientes" className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
            </Link>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Préstamos</h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Filter size={20} className={showFilters ? "text-teal-600 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
          </button>
        </header>

        {/* Filtros */}
        {showFilters && (
          <div className="space-y-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-none animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Filtro por Estado */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Estado
              </label>
              <div className="flex gap-2">
                {["todos", "activo", "pagado"].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setEstadoFiltro(estado as EstadoFiltro)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      estadoFiltro === estado
                        ? "bg-teal-600 text-white dark:bg-teal-500"
                        : "bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {estado === "todos" ? "Todos" : estado === "activo" ? "Activos" : "Pagados"}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Rango de Fechas */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Rango de Fechas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all"
                />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Botón Limpiar Filtros */}
            {(fechaInicio || fechaFin) && (
              <button
                onClick={() => {
                  setFechaInicio("");
                  setFechaFin("");
                }}
                className="w-full px-3 py-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 rounded-lg transition-colors"
              >
                Limpiar Fechas
              </button>
            )}
          </div>
        )}

        {/* Búsqueda */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
          />
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Total
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {stats.activos} activos • {stats.pagados} pagados
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Pendiente
            </div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(stats.montoPendiente)}
            </div>
          </div>
        </div>

        {/* Lista de Préstamos */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : prestamosFiltrados.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-zinc-400" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-1">No se encontraron préstamos.</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Intenta cambiar los filtros o la búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prestamosFiltrados.map((prestamo) => (
              <Link
                href={`/prestamos/detalle?id=${prestamo.id}`}
                key={prestamo.id}
                className="flex flex-col p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md transition-all hover:bg-zinc-50 dark:hover:bg-white/10 active:scale-[0.98] cursor-pointer shadow-sm dark:shadow-none"
              >
                {/* Encabezado: Cliente y Estado */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-200 to-teal-400 dark:from-teal-700 dark:to-teal-900 border border-white/50 dark:border-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {prestamo.clientes.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">{prestamo.clientes.nombre}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(prestamo.fecha_inicio)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${getEstadoColor(
                      prestamo.estado
                    )}`}
                  >
                    {getEstadoLabel(prestamo.estado)}
                  </span>
                </div>

                {/* Montos */}
                <div className="grid grid-cols-3 gap-3 mb-3 p-3 rounded-lg bg-zinc-50 dark:bg-white/5">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Monto</p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      {formatCurrency(prestamo.monto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Pendiente</p>
                    <p className={`font-bold text-sm ${
                      prestamo.saldo_pendiente > 0
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {formatCurrency(prestamo.saldo_pendiente)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Interés</p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      {prestamo.porcentaje_interes}%
                    </p>
                  </div>
                </div>

                {/* Progreso de Cuotas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">Cuotas</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {prestamo.cuotas_pagadas}/{prestamo.numero_cuotas}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-300"
                      style={{
                        width: `${(prestamo.cuotas_pagadas / prestamo.numero_cuotas) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200 dark:border-white/10">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Total a pagar: {formatCurrency(prestamo.total_a_pagar)}
                  </span>
                  <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
