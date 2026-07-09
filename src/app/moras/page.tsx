"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/DashboardLayout";
import { Search, AlertTriangle, Calendar, Clock, DollarSign, Receipt, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { moraService } from "@/services/databaseService";

interface MoraConRelaciones {
  id: string;
  user_id: string;
  prestamo_id: string;
  dias_atraso: number;
  monto_mora: number;
  porcentaje_mora: number;
  estado: "pendiente" | "pagada";
  fecha_generada: string;
  fecha_pagada: string | null;
  prestamos: {
    id: string;
    monto: number;
    saldo_pendiente: number;
    valor_cuota: number;
    tipo_pago: string;
    clientes: {
      id: string;
      nombre: string;
      telefono: string | null;
    } | null;
  } | null;
}

export default function MorasPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pendiente" | "todas">("pendiente");

  const { data: session } = useAuth();

  const { data: moras = [], isLoading: loading } = useQuery<MoraConRelaciones[]>({
    queryKey: ["moras", activeTab, session?.id],
    enabled: !!session?.id,
    queryFn: () => 
      activeTab === "pendiente" 
        ? moraService.getPendientes(session!.id) as Promise<MoraConRelaciones[]>
        : moraService.getAll(session!.id) as Promise<MoraConRelaciones[]>,
  });

  const filteredMoras = moras.filter((m) =>
    m.prestamos?.clientes?.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Determinar gravedad del atraso para estilos visuales
  const getAtrasoColor = (dias: number) => {
    if (dias <= 5) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20";
    if (dias <= 15) return "text-orange-650 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20";
    return "text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-6 relative z-10 pb-24">
        {/* Header */}
        <header className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => router.push("/")} 
            className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shadow-sm dark:shadow-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Moras y Atrasos</h1>
            <p className="text-xs font-medium text-zinc-550 dark:text-zinc-400 uppercase tracking-widest">Seguimiento de Clientes</p>
          </div>
        </header>

        {/* Selector de Pestañas (Tabs) */}
        <div className="flex p-1.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-inner">
          <button
            onClick={() => setActiveTab("pendiente")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "pendiente"
                ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-md font-black"
                : "text-zinc-505 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setActiveTab("todas")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "todas"
                ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-md font-black"
                : "text-zinc-505 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
            }`}
          >
            Historial / Todas
          </button>
        </div>

        {/* Barra de Búsqueda */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de cliente..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
          />
        </div>

        {/* Lista de Moras */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMoras.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 shadow-sm dark:shadow-none">
                <AlertTriangle size={36} className="mx-auto text-zinc-400 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {activeTab === "pendiente" 
                    ? "¡Excelente! No hay moras pendientes."
                    : "No se encontraron registros de moras."
                  }
                </p>
                <p className="text-xs text-zinc-500 mt-1">Todos los cobros están al día.</p>
              </div>
            ) : (
              filteredMoras.map((mora) => {
                const badgeStyle = getAtrasoColor(mora.dias_atraso);
                return (
                  <div
                    key={mora.id}
                    className="flex flex-col p-5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl backdrop-blur-md shadow-sm dark:shadow-none transition-all hover:bg-zinc-50 dark:hover:bg-white/10"
                  >
                    {/* Header Mora */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                          {mora.prestamos?.clientes?.nombre || "Cliente no disponible"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Préstamo original: <span className="font-semibold">{formatCurrency(mora.prestamos?.monto || 0)}</span>
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                        {mora.dias_atraso} {mora.dias_atraso === 1 ? "Día" : "Días"}
                      </span>
                    </div>

                    {/* Detalles */}
                    <div className="grid grid-cols-2 gap-3 py-3 my-2 border-y border-zinc-100 dark:border-white/5 text-xs text-zinc-650 dark:text-zinc-300">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <div>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Cargo por Mora</p>
                          <p className="font-bold text-zinc-800 dark:text-white text-sm">{formatCurrency(mora.monto_mora)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <div>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Frecuencia</p>
                          <p className="font-semibold capitalize">{mora.prestamos?.tipo_pago || "No definido"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <div>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Fecha de Cargo</p>
                          <p className="font-semibold">{formatDate(mora.fecha_generada)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Receipt size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <div>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Saldo Pendiente</p>
                          <p className="font-bold text-zinc-800 dark:text-white">{formatCurrency(mora.prestamos?.saldo_pendiente || 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pie y Acciones */}
                    <div className="flex justify-between items-center pt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        mora.estado === "pendiente" 
                          ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20" 
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                      }`}>
                        {mora.estado}
                      </span>
                      
                      {mora.estado === "pendiente" && mora.prestamos && (
                        <button
                          onClick={() => router.push(`/pagos/nuevo?prestamo_id=${mora.prestamos?.id}`)}
                          className="flex items-center gap-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 active:scale-95 text-white text-xs font-bold rounded-2xl transition-all shadow-md"
                        >
                          <Receipt size={12} />
                          Cobrar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
