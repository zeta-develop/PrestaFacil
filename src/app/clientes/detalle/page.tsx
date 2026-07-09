"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, Phone, MapPin, DollarSign, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { clienteService } from "@/services/databaseService";


function ClienteDetalleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { data: session } = useAuth();

  const { data: cliente, isLoading: loading } = useQuery({
    queryKey: ["cliente", id, session?.id],
    enabled: !!id && !!session?.id,
    queryFn: async () => {
      const data = await clienteService.getById(id!, session!.id);
      if (data && data.prestamos) {
        data.prestamos.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      }
      return data;
    }
  });

  if (loading) {
    return (
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="flex-1 p-6 relative z-10 space-y-6">
        <header className="flex items-center gap-4 pt-2">
          <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Cliente no encontrado</h1>
        </header>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 relative z-10 space-y-8 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shadow-sm dark:shadow-none">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Perfil del Cliente</h1>
          </div>
        </div>
        <Link 
          href={`/clientes/editar?id=${id}`}
          className="px-4 py-2 text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/20 rounded-xl transition-all active:scale-95 shadow-sm dark:shadow-[0_0_15px_rgba(20,184,166,0.1)]"
        >
          Editar
        </Link>
      </header>

      {/* Info Card */}
      <section className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-6 backdrop-blur-md flex flex-col items-center text-center space-y-4 relative overflow-hidden shadow-sm dark:shadow-none">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/15 dark:bg-teal-500/20 blur-[50px] rounded-full pointer-events-none"></div>
        
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-[0_0_20px_rgba(45,212,191,0.2)] border border-zinc-300 dark:border-white/10 flex items-center justify-center text-white text-3xl font-black relative z-10">
          {cliente.nombre.charAt(0).toUpperCase()}
        </div>
        
        <div className="space-y-1 relative z-10">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{cliente.nombre}</h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            cliente.estado === 'activo' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
          }`}>
            <Activity size={10} />
            {cliente.estado}
          </span>
        </div>

        <div className="w-full pt-4 mt-2 border-t border-zinc-100 dark:border-white/5 flex flex-col gap-3 text-left">
          <div className="flex items-center gap-3 text-sm text-zinc-650 dark:text-zinc-300">
            <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-teal-600 dark:text-teal-400"><Phone size={14} /></div>
            {cliente.telefono || "Sin teléfono registrado"}
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-650 dark:text-zinc-300">
            <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><MapPin size={14} /></div>
            {cliente.direccion || "Sin dirección registrada"}
          </div>
        </div>
      </section>

      {/* Historial de Préstamos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-sm font-medium text-zinc-550 dark:text-zinc-400 uppercase tracking-widest">Historial de Préstamos</h3>
          <span className="px-2.5 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-white text-xs font-bold rounded-full">
            {cliente.prestamos?.length || 0}
          </span>
        </div>

        <div className="space-y-3">
          {!cliente.prestamos || cliente.prestamos.length === 0 ? (
            <div className="text-center py-8 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 border-dashed shadow-sm dark:shadow-none">
              <DollarSign size={24} className="mx-auto text-zinc-400 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">Este cliente no tiene préstamos activos ni en el historial.</p>
            </div>
          ) : (
            cliente.prestamos.map((p) => (
              <Link 
                href={`/prestamos/detalle?id=${p.id}`}
                key={p.id} 
                className="flex flex-col p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Monto Original</span>
                    <span className="text-xl font-black text-zinc-900 dark:text-white">${p.monto}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                    p.estado === 'activo' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20' : 
                    p.estado === 'cancelado' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' : 
                    p.estado === 'pagado' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' : 
                    'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                  }`}>
                    {p.estado}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-500">Saldo Pendiente</span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-300">${p.saldo_pendiente}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-zinc-500">Cuotas</span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-300">{p.cuotas_pagadas} / {p.numero_cuotas}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default function ClienteDetallePage() {
  return (
    <Suspense fallback={
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    }>
      <ClienteDetalleContent />
    </Suspense>
  );
}
