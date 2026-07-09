"use client";

import { useState } from "react";
import Link from "next/link";

import DashboardLayout from "@/components/DashboardLayout";
import { Search, UserPlus, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { clienteService } from "@/services/databaseService";

export default function ClientesPage() {
  const [search, setSearch] = useState("");

  const { data: session } = useAuth();

  const { data: clientes = [], isLoading: loading } = useQuery({
    queryKey: ["clientes", session?.id],
    enabled: !!session?.id,
    queryFn: () => clienteService.getAll(session!.id),
  });

  const filteredClientes = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-6 relative z-10">
        <header className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Clientes</h1>
        </header>

        {/* Búsqueda */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
          />
        </div>

        {/* Lista de Clientes */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClientes.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                <p>No se encontraron clientes.</p>
              </div>
            ) : (
              filteredClientes.map((cliente) => (
                <Link
                  href={`/clientes/detalle?id=${cliente.id}`}
                  key={cliente.id}
                  className="flex flex-col p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md transition-all hover:bg-zinc-50 dark:hover:bg-white/10 active:scale-[0.98] cursor-pointer shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-900 border border-white/50 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-white font-bold">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{cliente.nombre}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Phone size={12} />
                          <span>{cliente.telefono || "Sin teléfono"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          cliente.estado === "activo" ? "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" : "bg-red-400"
                        }`}
                      ></span>
                    </div>
                  </div>
                  
                  {/* Préstamos del Cliente (Vista Rápida) */}
                  {cliente.prestamos && cliente.prestamos.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5 space-y-2 w-full">
                      {cliente.prestamos.map((p) => (
                        <div key={p.id} className="flex justify-between items-center bg-zinc-50 dark:bg-black/20 rounded-xl p-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wider uppercase">Préstamo</span>
                            <span className="text-sm text-zinc-900 dark:text-white font-semibold">${p.monto}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-zinc-500 font-medium">Pendiente</span>
                              <span className="text-sm text-zinc-800 dark:text-zinc-300 font-bold">${p.saldo_pendiente}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              p.estado === 'activo' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20' : 
                              p.estado === 'cancelado' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' : 
                              p.estado === 'pagado' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' : 
                              'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                            }`}>
                              {p.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {/* Botón Flotante (FAB) */}
        <Link href="/clientes/nuevo" className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_4px_20px_rgba(45,212,191,0.5)] flex items-center justify-center text-white active:scale-95 transition-all z-50">
          <UserPlus size={24} />
        </Link>
      </main>
    </DashboardLayout>
  );
}
