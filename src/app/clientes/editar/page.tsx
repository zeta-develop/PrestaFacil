"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, User, Phone, MapPin, Activity } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { clienteService } from "@/services/databaseService";

function ClientesEditarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    estado: "activo" as "activo" | "inactivo",
  });

  const { data: session } = useAuth();

  const { isLoading: loading } = useQuery({
    queryKey: ["cliente-editar", id, session?.id],
    enabled: !!id && !!session?.id,
    queryFn: async () => {
      const data = await clienteService.getById(id!, session!.id);
      if (data) {
        setFormData({
          nombre: data.nombre || "",
          telefono: data.telefono || "",
          direccion: data.direccion || "",
          estado: data.estado || "activo",
        });
      }
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      toast.warning("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      if (!session || !id) return;

      const { error } = await supabase
        .from("clientes")
        .update({
          nombre: formData.nombre,
          telefono: formData.telefono,
          direccion: formData.direccion,
          estado: formData.estado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", session.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["cliente-editar", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      
      toast.success("Cliente actualizado exitosamente");
      router.push(`/clientes/detalle?id=${id}`);
      router.refresh();
    } catch (error) {
      console.error("Error actualizando cliente:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 relative z-10 space-y-6 pb-24">
      <header className="flex items-center gap-4 pt-2">
        <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shadow-sm dark:shadow-none">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Editar Cliente</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Modificar Registro</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
            <User size={14} /> Nombre Completo
          </label>
          <input
            type="text"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej. María López"
            className="w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
          />
        </section>

        {/* Teléfono */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
            <Phone size={14} /> Teléfono
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="Ej. 555-1234"
            className="w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none"
          />
        </section>

        {/* Dirección */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
            <MapPin size={14} /> Dirección
          </label>
          <textarea
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Ej. Calle Principal #123"
            rows={3}
            className="w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md shadow-sm dark:shadow-none resize-none"
          />
        </section>

        {/* Estado */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
            <Activity size={14} /> Estado
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, estado: "activo" })}
              className={`py-3 rounded-2xl border font-bold text-sm transition-all active:scale-[0.98] ${
                formData.estado === "activo"
                  ? "bg-teal-50 dark:bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                  : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Activo
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, estado: "inactivo" })}
              className={`py-3 rounded-2xl border font-bold text-sm transition-all active:scale-[0.98] ${
                formData.estado === "inactivo"
                  ? "bg-red-50 dark:bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Inactivo
            </button>
          </div>
        </section>

        {/* Botón Guardar */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 px-4 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(20,184,166,0.4)] mt-4"
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </main>
  );
}

export default function ClientesEditarPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    }>
      <ClientesEditarContent />
    </Suspense>
  );
}
