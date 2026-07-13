"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, Search, Filter, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from '@/hooks/useDebounce';
import { pagoService } from '@/services/databaseService';
import { formatCurrency } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";


interface Pago {
  id: string;
  prestamo_id: string;
  monto_pagado: number;
  capital_abonado: number;
  interes_pagado: number;
  numero_cuota: number;
  fecha_pago: string;
  metodo_pago?: string;
  prestamos: {
    id: string;
    cliente_id: string;
    clientes: {
      nombre: string;
    };
  };
}

export default function PagosPage() {
  const [search, setSearch] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const debouncedSearch = useDebounce(search, 500);

  const { data: session } = useAuth();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["pagos-paginated", session?.id, debouncedSearch, fechaInicio, fechaFin, page],
    enabled: !!session?.id,
    queryFn: () => pagoService.getPaginated(session!.id, debouncedSearch, fechaInicio, fechaFin, page, pageSize),
    placeholderData: keepPreviousData,
  });

  const { data: statsData } = useQuery({
    queryKey: ["pagos-stats", session?.id, debouncedSearch, fechaInicio, fechaFin],
    enabled: !!session?.id,
    queryFn: () => pagoService.getStats(session!.id, debouncedSearch, fechaInicio, fechaFin),
  });

  const pagosFiltrados = (data?.data as unknown as Pago[]) || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Estadísticas
  const stats = statsData || {
    total: 0,
    totalMonto: 0,
    totalCapital: 0,
    totalInteres: 0,
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-6 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
            </Link>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Historial de Pagos</h1>
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
            {/* Filtro por Rango de Fechas */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Rango de Fechas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
                  className="flex-1 px-3 py-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all"
                />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
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
                  setPage(1);
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por cliente..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
          />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Total Pagos
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {formatCurrency(stats.totalMonto)}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Desglose
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Capital:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalCapital)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Interés:</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(stats.totalInteres)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Pagos */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-zinc-400" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-1">No se encontraron pagos.</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Intenta cambiar los filtros o la búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagosFiltrados.map((pago) => (
              <Link
                href={`/prestamos/detalle?id=${pago.prestamo_id}`}
                key={pago.id}
                className="flex flex-col p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md transition-all hover:bg-zinc-50 dark:hover:bg-white/10 active:scale-[0.98] cursor-pointer shadow-sm dark:shadow-none"
              >
                {/* Encabezado: Cliente, Fecha y Estatus */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-200 to-teal-400 dark:from-teal-700 dark:to-teal-900 border border-white/50 dark:border-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {pago.prestamos.clientes.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                        {pago.prestamos.clientes.nombre}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDateOnly(pago.fecha_pago)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 ml-2">
                    <CheckCircle2 size={18} />
                  </div>
                </div>

                {/* Montos Principales */}
                <div className="grid grid-cols-3 gap-3 mb-3 p-3 rounded-lg bg-zinc-50 dark:bg-white/5">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Pagado</p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      {formatCurrency(pago.monto_pagado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Capital</p>
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(pago.capital_abonado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Interés</p>
                    <p className="font-bold text-sm text-orange-600 dark:text-orange-400">
                      {formatCurrency(pago.interes_pagado)}
                    </p>
                  </div>
                </div>

                {/* Información Adicional */}
                <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">Cuota #{pago.numero_cuota}</span>
                    <span className="text-zinc-400 dark:text-zinc-600">•</span>
                    <span className="capitalize">{pago.metodo_pago || "Efectivo"}</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 pb-2 border-t border-zinc-200 dark:border-white/10 mt-6 relative z-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>

            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Página {page} de {totalPages}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
