"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Wallet, Calendar, Plus, ChevronRight, Activity, DollarSign } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Pago {
  id: string;
  monto_pagado: number;
  capital_abonado: number;
  interes_pagado: number;
  fecha_pago: string;
  numero_cuota: number;
}

interface Prestamo {
  id: string;
  cliente_id: string;
  monto: number;
  porcentaje_interes: number;
  total_a_pagar: number;
  ganancia_esperada: number;
  tipo_pago: string;
  numero_cuotas: number;
  valor_cuota: number;
  cuotas_pagadas: number;
  saldo_pendiente: number;
  capital_recuperado: number;
  interes_ganado: number;
  fecha_inicio: string;
  estado: string;
  pagos: Pago[];
  clientes: {
    nombre: string;
  };
}

function PrestamoDetalleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: prestamo, isLoading: loading, refetch } = useQuery({
    queryKey: ["prestamo", id],
    enabled: !!id && !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestamos")
        .select(`
          *,
          clientes ( nombre ),
          pagos (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Sort payments by date descending
      if (data.pagos) {
        data.pagos.sort((a: any, b: any) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
      }
      return data as Prestamo;
    },
  });

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestamo || !session) return;

    const montoPago = parseFloat(paymentAmount);
    if (isNaN(montoPago) || montoPago <= 0 || montoPago > prestamo.saldo_pendiente) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Matemáticas Proporcionales
      // Si presté $1000 y el total a pagar era $1200, entonces el capital es (1000/1200) = 83.33% del pago
      const proporcionCapital = prestamo.monto / prestamo.total_a_pagar;
      
      const capitalAbonado = montoPago * proporcionCapital;
      const interesPagado = montoPago - capitalAbonado;
      
      const nuevoSaldo = prestamo.saldo_pendiente - montoPago;
      const nuevoCapitalRecuperado = prestamo.capital_recuperado + capitalAbonado;
      const nuevoInteresGanado = prestamo.interes_ganado + interesPagado;
      const nuevasCuotasPagadas = prestamo.cuotas_pagadas + 1;
      const nuevoEstado = nuevoSaldo <= 0.01 ? "pagado" : prestamo.estado;

      // 2. Insertar Pago
      const { error: pagoError } = await supabase.from("pagos").insert({
        user_id: session.id,
        prestamo_id: prestamo.id,
        monto_pagado: montoPago,
        capital_abonado: capitalAbonado,
        interes_pagado: interesPagado,
        numero_cuota: nuevasCuotasPagadas,
        metodo_pago: "efectivo"
      });

      if (pagoError) throw pagoError;

      // 3. Actualizar Préstamo
      const { error: prestamoError } = await supabase
        .from("prestamos")
        .update({
          saldo_pendiente: nuevoSaldo < 0 ? 0 : nuevoSaldo,
          cuotas_pagadas: nuevasCuotasPagadas,
          capital_recuperado: nuevoCapitalRecuperado,
          interes_ganado: nuevoInteresGanado,
          estado: nuevoEstado
        })
        .eq("id", prestamo.id);

      if (prestamoError) throw prestamoError;

      // 4. Actualizar Capital Config
      const { data: configData } = await supabase
        .from("capital_config")
        .select("*")
        .eq("user_id", session.id)
        .single();

      if (configData) {
        await supabase
          .from("capital_config")
          .update({
            capital_disponible: Number(configData.capital_disponible) + montoPago,
            capital_en_calle: Number(configData.capital_en_calle) - capitalAbonado,
            ganancia_total: Number(configData.ganancia_total) + interesPagado,
            total_recuperado: Number(configData.total_recuperado) + montoPago
          })
          .eq("user_id", session.id);
      }

      toast.success(`Pago de $${montoPago} registrado`);
      setShowPaymentModal(false);
      setPaymentAmount("");
      
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["prestamo", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });

    } catch (error) {
      console.error("Error registering payment:", error);
      toast.error("Ocurrió un error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-zinc-50 dark:bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    );
  }

  if (!prestamo) {
    return (
      <main className="flex-1 p-6 relative z-10 space-y-6">
        <header className="flex items-center gap-4 pt-2">
          <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Préstamo no encontrado</h1>
        </header>
      </main>
    );
  }

  const progress = Math.min(100, Math.round(((prestamo.total_a_pagar - prestamo.saldo_pendiente) / prestamo.total_a_pagar) * 100));

  return (
    <main className="flex-1 p-6 relative z-10 space-y-6 pb-24">
      {/* Modal de Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Registrar Pago</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">El saldo actual es de ${prestamo.saldo_pendiente.toFixed(2)}</p>
            
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1 mb-2 block">Monto a abonar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign size={18} className="text-zinc-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={prestamo.saldo_pendiente}
                    required
                    autoFocus
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-xl font-bold text-zinc-900 dark:text-white"
                    placeholder={prestamo.valor_cuota.toFixed(2)}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-4 pt-2">
        <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shadow-sm dark:shadow-none">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Detalle de Préstamo</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{prestamo.clientes?.nombre}</p>
        </div>
      </header>

      {/* Tarjeta de Resumen */}
      <section className="rounded-[2rem] bg-zinc-900 dark:bg-white/5 border border-zinc-800 dark:border-white/10 p-6 shadow-2xl relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none transition-colors ${
          prestamo.estado === 'activo' ? 'bg-teal-500' :
          prestamo.estado === 'pagado' ? 'bg-blue-500' :
          prestamo.estado === 'cancelado' ? 'bg-red-500' : 'bg-orange-500'
        }`}></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              prestamo.estado === 'activo' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 
              prestamo.estado === 'cancelado' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
              prestamo.estado === 'pagado' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
              'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }`}>
              <Activity size={12} />
              {prestamo.estado}
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Otorgado</span>
              <span className="text-xs font-medium text-zinc-300">{new Date(prestamo.fecha_inicio).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="mb-8">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Saldo Pendiente</span>
            <div className="text-5xl font-black text-white tracking-tighter">${prestamo.saldo_pendiente.toFixed(2)}</div>
          </div>

          {/* Barra de Progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-zinc-400">Progreso de pago</span>
              <span className="text-white font-bold">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  prestamo.estado === 'activo' ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' :
                  prestamo.estado === 'pagado' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                  'bg-zinc-500'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Acciones */}
      {prestamo.estado === 'activo' && (
        <button 
          onClick={() => {
            setPaymentAmount(prestamo.valor_cuota.toString());
            setShowPaymentModal(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(20,184,166,0.3)]"
        >
          <Plus size={20} />
          <span>Registrar Pago (${prestamo.valor_cuota.toFixed(2)})</span>
        </button>
      )}

      {/* Detalles Secundarios */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Préstamo Original</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">${prestamo.monto}</span>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total a Devolver</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">${prestamo.total_a_pagar}</span>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Interés</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{prestamo.porcentaje_interes}%</span>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Cuotas Pagadas</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{prestamo.cuotas_pagadas} de {prestamo.numero_cuotas}</span>
        </div>
      </div>

      {/* Historial de Pagos */}
      <section className="space-y-4 pt-2">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest pl-1">Historial de Pagos</h3>
        
        <div className="space-y-3">
          {!prestamo.pagos || prestamo.pagos.length === 0 ? (
            <div className="text-center py-8 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 border-dashed">
              <Calendar size={24} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">Aún no hay pagos registrados.</p>
            </div>
          ) : (
            prestamo.pagos.map((pago) => (
              <div key={pago.id} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-500">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white block mb-0.5">Abono a Cuota</span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {new Date(pago.fecha_pago).toLocaleString('es-ES', { 
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-teal-600 dark:text-teal-400">+${pago.monto_pagado.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default function PrestamoDetallePage() {
  return (
    <Suspense fallback={
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-zinc-50 dark:bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    }>
      <PrestamoDetalleContent />
    </Suspense>
  );
}
