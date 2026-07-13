"use client";

import { useState, useMemo } from 'react';
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft, X, DollarSign, Wallet } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { cajaService } from '@/services/databaseService';

interface Movimiento {
  id: string;
  tipo: "entrada" | "salida";
  categoria: string;
  monto: number;
  descripcion: string;
  fecha: string;
  created_at: string;
}

interface CapitalConfig {
  capital_disponible: number;
}

const CATEGORIAS_ENTRADA = [
  { value: "pago_cliente", label: "Pago Cliente" },
  { value: "inyeccion_capital", label: "Inyección Capital" },
  { value: "otro", label: "Otro" },
];

const CATEGORIAS_SALIDA = [
  { value: "desembolso_prestamo", label: "Desembolso Préstamo" },
  { value: "retiro_ganancia", label: "Retiro Ganancia" },
  { value: "gasto_operativo", label: "Gasto Operativo" },
  { value: "otro", label: "Otro" },
];

export default function CajaPage() {
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "entrada" | "salida">("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<"entrada" | "salida">("entrada");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    categoria: "",
    monto: "",
    descripcion: "",
  });

  const queryClient = useQueryClient();

  const { data: session } = useAuth();

  const { data: capital = { capital_disponible: 0 } } = useQuery({
    queryKey: ["capital", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      try {
        const data = await cajaService.getCapitalDisponible(session!.id);
        return (data || { capital_disponible: 0 }) as CapitalConfig;
      } catch (err) {
        return { capital_disponible: 0 };
      }
    },
  });

  const { data: movimientos = [], isLoading: loading } = useQuery({
    queryKey: ["movimientos-caja", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      try {
        const data = await cajaService.getAllMovimientos(session!.id);
        return data as Movimiento[];
      } catch (err) {
        return [];
      }
    },
  });

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      // Filtro por tipo
      if (tipoFiltro !== "todos" && m.tipo !== tipoFiltro) {
        return false;
      }

      // Filtro por búsqueda
      if (search && !m.descripcion.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Filtro por rango de fechas
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        const movimientoFecha = new Date(m.fecha);
        if (movimientoFecha < inicio) return false;
      }

      if (fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
        const movimientoFecha = new Date(m.fecha);
        if (movimientoFecha > fin) return false;
      }

      return true;
    });
  }, [movimientos, tipoFiltro, search, fechaInicio, fechaFin]);

  // Estadísticas
  const stats = {
    totalEntradas: movimientosFiltrados
      .filter((m) => m.tipo === "entrada")
      .reduce((sum, m) => sum + m.monto, 0),
    totalSalidas: movimientosFiltrados
      .filter((m) => m.tipo === "salida")
      .reduce((sum, m) => sum + m.monto, 0),
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoriaLabel = (categoria: string) => {
    const todas = [...CATEGORIAS_ENTRADA, ...CATEGORIAS_SALIDA];
    return todas.find((c) => c.value === categoria)?.label || categoria;
  };

  const handleOpenModal = (tipo: "entrada" | "salida") => {
    setModalTipo(tipo);
    setFormData({
      categoria: "",
      monto: "",
      descripcion: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoria || !formData.monto) {
      toast.error("Completa los datos requeridos");
      return;
    }

    const monto = parseFloat(formData.monto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (modalTipo === "salida" && monto > capital.capital_disponible) {
      toast.error("No hay suficiente capital disponible");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!session) return;

      await cajaService.insertMovimiento(
        session.id,
        modalTipo,
        formData.categoria,
        monto,
        formData.descripcion
      );

      toast.success(`${modalTipo === "entrada" ? "Ingreso" : "Egreso"} registrado exitosamente`);
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["movimientos-caja", session.id] });
      queryClient.invalidateQueries({ queryKey: ["capital", session.id] });
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
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
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Gestión de Caja</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Control de ingresos y egresos</p>
            </div>
          </div>
        </header>

        {/* Capital Disponible */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-500/10 dark:to-teal-500/5 border border-teal-200 dark:border-teal-500/20 p-6 shadow-lg dark:shadow-none">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/20 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 mb-2">
              <Wallet size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Capital Disponible</span>
            </div>
            <div className="text-4xl font-black text-teal-900 dark:text-teal-300">
              {formatCurrency(capital.capital_disponible)}
            </div>
          </div>
        </section>

        {/* Botones de Acción */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOpenModal("entrada")}
            className="group flex flex-col items-center gap-3 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
              <ArrowDownLeft size={24} />
            </div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Ingreso</span>
          </button>
          <button
            onClick={() => handleOpenModal("salida")}
            className="group flex flex-col items-center gap-3 rounded-3xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-orange-100 dark:hover:bg-orange-500/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Egreso</span>
          </button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="space-y-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-none animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Filtro por Tipo */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Tipo
              </label>
              <div className="flex gap-2">
                {["todos", "entrada", "salida"].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setTipoFiltro(tipo as "todos" | "entrada" | "salida")}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      tipoFiltro === tipo
                        ? "bg-teal-600 text-white dark:bg-teal-500"
                        : "bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {tipo === "todos" ? "Todos" : tipo === "entrada" ? "Ingresos" : "Egresos"}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Fechas */}
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-500" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descripción..."
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-3 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-2xl transition-colors bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none"
          >
            <Filter size={20} className={showFilters ? "text-teal-600 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 shadow-sm dark:shadow-none">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
              Total Ingresos
            </div>
            <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300">{formatCurrency(stats.totalEntradas)}</div>
          </div>
          <div className="rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4 shadow-sm dark:shadow-none">
            <div className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1">
              Total Egresos
            </div>
            <div className="text-xl font-bold text-orange-900 dark:text-orange-300">{formatCurrency(stats.totalSalidas)}</div>
          </div>
        </div>

        {/* Historial de Movimientos */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
              <DollarSign size={24} className="text-zinc-400" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-1">No hay movimientos</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Intenta cambiar los filtros o registra un movimiento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {movimientosFiltrados.map((movimiento) => (
              <div
                key={movimiento.id}
                className="flex flex-col p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md transition-all shadow-sm dark:shadow-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
                        movimiento.tipo === "entrada"
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                          : "bg-gradient-to-br from-orange-500 to-orange-600"
                      }`}
                    >
                      {movimiento.tipo === "entrada" ? (
                        <ArrowDownLeft size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">
                        {getCategoriaLabel(movimiento.categoria)}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(movimiento.fecha)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      movimiento.tipo === "entrada"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {movimiento.tipo === "entrada" ? "+" : "-"}
                    {formatCurrency(movimiento.monto)}
                  </span>
                </div>

                {movimiento.descripcion && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 px-1">
                    {movimiento.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Nuevo Movimiento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/20 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/10 p-6 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Registrar {modalTipo === "entrada" ? "Ingreso" : "Egreso"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoría *</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white"
                >
                  <option value="">Seleccionar categoría...</option>
                  {(modalTipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SALIDA).map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white font-medium transition-all hover:bg-zinc-200 dark:hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-all ${
                    modalTipo === "entrada"
                      ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50"
                      : "bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50"
                  }`}
                >
                  {isSubmitting ? "Procesando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
