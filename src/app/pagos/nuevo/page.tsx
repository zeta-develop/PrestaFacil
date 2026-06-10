"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CustomSelect from "@/components/CustomSelect";
import { ArrowLeft, User, DollarSign, Activity } from "lucide-react";

interface Prestamo {
  id: string;
  cliente_id: string;
  saldo_pendiente: number;
  cuota_monto: number;
  clientes: {
    nombre: string;
  };
}

export default function NuevoPagoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null);
  
  const [formData, setFormData] = useState({
    prestamo_id: "",
    monto_pagado: "",
  });

  useEffect(() => {
    const fetchPrestamos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("prestamos")
        .select(`
          id,
          cliente_id,
          saldo_pendiente,
          cuota_monto,
          clientes ( nombre )
        `)
        .eq("user_id", user.id)
        .eq("estado", "activo");
      
      if (data) {
        // @ts-ignore
        setPrestamos(data);
      }
    };
    fetchPrestamos();
  }, []);

  const handlePrestamoSelect = (prestamoId: string) => {
    const p = prestamos.find(x => x.id === prestamoId);
    setSelectedPrestamo(p || null);
    setFormData({
      prestamo_id: prestamoId,
      monto_pagado: p ? p.cuota_monto.toString() : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(formData.monto_pagado) || 0;
    
    if (!selectedPrestamo || monto <= 0) return alert("Completa los datos correctamente.");
    if (monto > selectedPrestamo.saldo_pendiente) return alert("El monto supera el saldo pendiente.");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Insert pago
      const { error: pagoError } = await supabase.from("pagos").insert({
        prestamo_id: selectedPrestamo.id,
        user_id: user.id,
        cliente_id: selectedPrestamo.cliente_id,
        monto_pagado: monto,
        estado: "completado"
      });

      if (pagoError) throw pagoError;

      // 2. Update prestamo saldo
      const nuevoSaldo = selectedPrestamo.saldo_pendiente - monto;
      const estadoNuevo = nuevoSaldo <= 0 ? "pagado" : "activo";

      const { error: updateError } = await supabase
        .from("prestamos")
        .update({ 
          saldo_pendiente: nuevoSaldo,
          estado: estadoNuevo
        })
        .eq("id", selectedPrestamo.id);

      if (updateError) throw updateError;
      
      alert("Pago registrado exitosamente");
      router.push("/");
    } catch (error) {
      console.error("Error creating pago:", error);
      alert("Error al registrar el pago");
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
          <h1 className="text-xl font-bold text-white">Registrar Pago</h1>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Abono a Préstamo</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Préstamo / Cliente */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
            <User size={14} /> Seleccionar Cliente con Préstamo
          </label>
          <CustomSelect
            options={prestamos.map((p) => ({
              value: p.id,
              label: `${p.clientes?.nombre} - Pendiente: $${p.saldo_pendiente}`,
            }))}
            value={formData.prestamo_id}
            onChange={(val) => handlePrestamoSelect(val)}
            placeholder="Seleccionar..."
            theme="blue"
          />
        </section>

        {selectedPrestamo && (
          <div className="rounded-3xl bg-blue-500/10 border border-blue-500/20 p-5 backdrop-blur-md space-y-3 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Saldo Actual:</span>
              <span className="text-white font-bold">${selectedPrestamo.saldo_pendiente.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cuota Sugerida:</span>
              <span className="text-blue-400 font-bold">${selectedPrestamo.cuota_monto.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Monto del Pago */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
            <DollarSign size={14} /> Monto a Pagar
          </label>
          <input
            type="number"
            required
            min="1"
            max={selectedPrestamo?.saldo_pendiente || undefined}
            value={formData.monto_pagado}
            onChange={(e) => setFormData({ ...formData, monto_pagado: e.target.value })}
            placeholder="0.00"
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-white backdrop-blur-md text-xl font-bold"
          />
        </section>

        <button
          type="submit"
          disabled={loading || !selectedPrestamo}
          className="w-full py-4 px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(59,130,246,0.4)] mt-4"
        >
          {loading ? "Registrando..." : "Confirmar Pago"}
        </button>
      </form>
    </main>
  );
}
