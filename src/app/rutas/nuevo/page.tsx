"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CustomSelect from "@/components/CustomSelect";
import { ArrowLeft, MapPin, Calendar, AlignLeft } from "lucide-react";
import { toast } from "sonner";

export default function NuevaRutaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    dia_semana: "Lunes",
  });

  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      toast.warning("El nombre es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("rutas_cobro").insert({
        user_id: user.id,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        dia_semana: formData.dia_semana,
        activa: true
      });

      if (error) throw error;
      
      toast.success("Ruta creada exitosamente");
      router.push("/rutas");
    } catch (error) {
      console.error("Error creating ruta:", error);
      toast.error("Error al registrar la ruta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 p-6 relative z-10 space-y-6 pb-24">
      <header className="flex items-center gap-4 pt-2">
        <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Nueva Ruta</h1>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Crear Registro</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
            <MapPin size={14} /> Nombre de la Ruta
          </label>
          <input
            type="text"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej. Zona Centro"
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-white backdrop-blur-md"
          />
        </section>

        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
            <Calendar size={14} /> Día de la Semana
          </label>
          <CustomSelect
            options={diasSemana.map((dia) => ({ value: dia, label: dia }))}
            value={formData.dia_semana}
            onChange={(val) => setFormData({ ...formData, dia_semana: val })}
            theme="indigo"
          />
        </section>

        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
            <AlignLeft size={14} /> Descripción (Opcional)
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Ej. Cobros de 9am a 2pm"
            rows={3}
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-white backdrop-blur-md resize-none"
          />
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(99,102,241,0.4)] mt-4"
        >
          {loading ? "Registrando..." : "Guardar Ruta"}
        </button>
      </form>
    </main>
  );
}
