"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, RefreshCw, Receipt, BarChart3, Briefcase, Users, DollarSign, Map, User, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/databaseService";

export default function Home() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: config, isLoading: loading } = useQuery({
    queryKey: ["dashboardData", session?.id],
    enabled: !!session?.id,
    queryFn: () => dashboardService.getStats(session!.id),
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const greeting = getGreeting();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-NI", {
      style: "currency",
      currency: "NIO",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const fullName = session?.user_metadata?.full_name || session?.email?.split("@")[0] || "Usuario";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center pt-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-8 relative z-10">
        <header className="flex items-center justify-between pt-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">{greeting}, {fullName}</h1>
            <p className="text-xs font-medium text-zinc-550 dark:text-zinc-400 uppercase tracking-widest">Resumen de hoy</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_15px_rgba(45,212,191,0.3)] flex items-center justify-center text-white font-bold text-lg">
            {fullName.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Tarjeta Principal (Capital en Calle) */}
        <section className="relative overflow-hidden rounded-[2rem] bg-zinc-900 dark:bg-white/5 border border-zinc-800 dark:border-white/10 p-6 shadow-2xl transition-colors duration-300">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/20 blur-3xl"></div>
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-teal-400 mb-2">
              <Wallet size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Capital Disponible</span>
            </div>
            <span className="text-4xl font-black tracking-tighter text-white">
              {formatCurrency(config?.capital_disponible || 0)}
            </span>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full">
                <ArrowUpRight size={14} />
                <span className="font-semibold text-xs">Activo</span>
              </div>
              <span className="text-zinc-450 text-xs">Rendimiento óptimo</span>
            </div>
          </div>
        </section>

        {/* KPIs Secundarios */}
        <section className="grid grid-cols-2 gap-3.5">
          <div className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 xs:p-5 shadow-lg dark:shadow-none transition-colors duration-300 relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400 mb-2.5">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">En Calle</span>
            </div>
            <span className="text-lg xs:text-xl sm:text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300 block truncate">
              {formatCurrency(config?.capital_en_calle || 0)}
            </span>
          </div>
          <div className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 xs:p-5 shadow-lg dark:shadow-none transition-colors duration-300 relative overflow-hidden">
            <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400 mb-2.5">
              <ArrowUpRight size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Ganancia</span>
            </div>
            <span className="text-lg xs:text-xl sm:text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300 block truncate">
              {formatCurrency(config?.ganancia_total || 0)}
            </span>
          </div>
          <div className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 xs:p-5 shadow-lg dark:shadow-none transition-colors duration-300 relative overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2.5">
              <ArrowDownRight size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Recuperado</span>
            </div>
            <span className="text-lg xs:text-xl sm:text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300 block truncate">
              {formatCurrency((config?.total_recuperado || 0) + (config?.ganancia_total || 0))}
            </span>
          </div>
          <div className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 xs:p-5 shadow-lg dark:shadow-none transition-colors duration-300 relative overflow-hidden">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2.5">
              <Plus size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Prestado</span>
            </div>
            <span className="text-lg xs:text-xl sm:text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300 block truncate">
              {formatCurrency(config?.total_prestado || 0)}
            </span>
          </div>
        </section>

        {/* Accesos Rápidos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-sm font-medium text-zinc-550 dark:text-zinc-400 uppercase tracking-widest">Accesos Rápidos</h3>
            <span className="text-[10px] font-medium text-zinc-450 dark:text-zinc-550 uppercase tracking-[0.2em]">Rutas visibles</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/clientes" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-650 dark:text-violet-400 transition-all">
                <Users size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Clientes</span>
            </Link>
            <Link href="/prestamos" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 transition-all">
                <DollarSign size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Préstamos</span>
            </Link>
            <Link href="/pagos" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 transition-all">
                <Receipt size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Pagos</span>
            </Link>
            <Link href="/reportes" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-all">
                <BarChart3 size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Reportes</span>
            </Link>
            <Link href="/moras" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all">
                <AlertTriangle size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Moras</span>
            </Link>
            <Link href="/caja" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 transition-all">
                <Briefcase size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Caja</span>
            </Link>
            <Link href="/rutas" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-650 dark:text-teal-400 transition-all">
                <Map size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Rutas</span>
            </Link>
            <Link href="/perfil" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-350 transition-all">
                <User size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-300">Perfil</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Link href="/prestamos/nuevo" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all">
                <Plus size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Préstamo</span>
            </Link>
            <Link href="/pagos/nuevo" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-all">
                <RefreshCw size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Pago</span>
            </Link>
            <Link href="/caja" className="group flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-5 active:scale-95 transition-all shadow-lg dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 transition-all">
                <Briefcase size={24} />
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Caja</span>
            </Link>
          </div>
        </section>

      </main>
    </DashboardLayout>
  );
}
