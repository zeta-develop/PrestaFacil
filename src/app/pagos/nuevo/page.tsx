"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CustomSelect from "@/components/CustomSelect";
import { ArrowLeft, User, DollarSign } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Prestamo {
  id: string;
  cliente_id: string;
  monto: number;
  total_a_pagar: number;
  saldo_pendiente: number;
  valor_cuota: number;
  cuotas_pagadas: number;
  capital_recuperado: number;
  interes_ganado: number;
  estado: string;
  clientes: {
    nombre: string;
  } | null;
}

export default function NuevoPagoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null);
  
  const [formData, setFormData] = useState({
    prestamo_id: "",
    monto_pagado: "",
  });

  const { data: prestamos = [] } = useQuery({
    queryKey: ["prestamos-activos", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("prestamos")
        .select(`
          *,
          clientes ( nombre )
        `)
        .eq("user_id", session!.id)
        .eq("estado", "activo");
      
      return (data as unknown as Prestamo[]) || [];
    }
  });

  const handlePrestamoSelect = (prestamoId: string) => {
    const p = prestamos.find(x => x.id === prestamoId);
    setSelectedPrestamo(p || null);
    setFormData({
      prestamo_id: prestamoId,
      monto_pagado: p ? p.valor_cuota.toString() : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoPago = parseFloat(formData.monto_pagado) || 0;
    
    if (!selectedPrestamo || montoPago <= 0) {
      toast.error("Completa los datos correctamente.");
      return;
    }
    if (montoPago > selectedPrestamo.saldo_pendiente + 0.01) {
      toast.error("El monto supera el saldo pendiente.");
      return;
    }

    setLoading(true);
    try {
      if (!session) return;

      // 1. Matemáticas Proporcionales
      const proporcionCapital = selectedPrestamo.monto / selectedPrestamo.total_a_pagar;
      const capitalAbonado = montoPago * proporcionCapital;
      const interesPagado = montoPago - capitalAbonado;

      const nuevoSaldo = selectedPrestamo.saldo_pendiente - montoPago;
      const nuevoCapitalRecuperado = Number(selectedPrestamo.capital_recuperado) + capitalAbonado;
      const nuevoInteresGanado = Number(selectedPrestamo.interes_ganado) + interesPagado;
      const nuevasCuotasPagadas = selectedPrestamo.cuotas_pagadas + 1;
      const nuevoEstado = nuevoSaldo <= 0.01 ? "pagado" : selectedPrestamo.estado;

      // 2. Insertar Pago
      const { error: pagoError } = await supabase.from("pagos").insert({
        user_id: session.id,
        prestamo_id: selectedPrestamo.id,
        monto_pagado: montoPago,
        capital_abonado: capitalAbonado,
        interes_pagado: interesPagado,
        numero_cuota: nuevasCuotasPagadas,
        metodo_pago: "efectivo"
      });

      if (pagoError) throw pagoError;

      // 3. Actualizar Préstamo
      const { error: updateError } = await supabase
        .from("prestamos")
        .update({ 
          saldo_pendiente: Math.max(nuevoSaldo, 0),
          cuotas_pagadas: nuevasCuotasPagadas,
          capital_recuperado: nuevoCapitalRecuperado,
          interes_ganado: nuevoInteresGanado,
          estado: nuevoEstado
        })
        .eq("id", selectedPrestamo.id);

      if (updateError) throw updateError;

      // 4. Actualizar Capital Config
      const { data: configData } = await supabase
        .from("capital_config")
        .select("*")
        .eq("user_id", session.id)
        .single();

      if (configData) {
        const { error: configError } = await supabase
          .from("capital_config")
          .update({
            capital_disponible: Number(configData.capital_disponible) + montoPago,
            capital_en_calle: Number(configData.capital_en_calle) - capitalAbonado,
            ganancia_total: Number(configData.ganancia_total) + interesPagado,
            total_recuperado: Number(configData.total_recuperado) + capitalAbonado
          })
          .eq("user_id", session.id);
        
        if (configError) console.error("Error updating capital_config:", configError);
      }
      
      queryClient.invalidateQueries({ queryKey: ["prestamos"] });
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });

      toast.success("Pago registrado exitosamente");
      router.push("/pagos");
    } catch (error) {
      console.error("Error creating pago:", error);
      toast.error("Error al registrar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 p-6 relative z-10 space-y-6 pb-24">
      <header className="flex items-center gap-4 pt-2">
        <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shadow-sm dark:shadow-none">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Registrar Pago</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Abono a Préstamo</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Préstamo / Cliente */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
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
          <div className="rounded-3xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-5 backdrop-blur-md space-y-3 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Saldo Actual:</span>
              <span className="text-zinc-900 dark:text-white font-bold">${selectedPrestamo.saldo_pendiente.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Cuota Sugerida:</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">${selectedPrestamo.valor_cuota.toFixed(2)}</span>
            </div>
          </div>
        )}


        {/* Monto del Pago */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
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
            className="w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 backdrop-blur-md text-xl font-bold shadow-sm dark:shadow-none"
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
