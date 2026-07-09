"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from "@/components/DashboardLayout";
import { MapPin, Wallet, DollarSign, Phone, Activity } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

interface Pago {
  id: string;
  fecha_pago: string;
  monto_pagado: number;
}

interface Prestamo {
  id: string;
  cliente_id: string;
  monto: number;
  saldo_pendiente: number;
  total_a_pagar: number;
  valor_cuota: number;
  tipo_pago: string;
  fecha_inicio: string;
  estado: string;
  cuotas_pagadas: number;
  capital_recuperado: number;
  interes_ganado: number;
  clientes: Cliente;
  pagos: Pago[];
}

export default function RutasInteligentesPage() {
  const queryClient = useQueryClient();
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = useAuth();

  const { data: prestamos, isLoading } = useQuery({
    queryKey: ["rutasDiarias"],
    enabled: !!session?.id,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("prestamos")
        .select(`
          *,
          clientes (*),
          pagos (*)
        `)
        .or(`estado.eq.activo,and(estado.eq.pagado,updated_at.gte.${todayStart.toISOString()})`);

      if (error) throw error;
      return data as unknown as Prestamo[];
    },
  });

  // Determinar quiénes tocan hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayDiff = (d1: Date, d2: Date) => {
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isDueToday = (p: Prestamo) => {
    const start = new Date(p.fecha_inicio);
    start.setHours(0, 0, 0, 0);

    // Si empezó hoy o en el futuro, solo toca si es hoy.
    if (today < start) return false;

    switch (p.tipo_pago) {
      case "diario":
        return true;
      case "semanal":
        return start.getDay() === today.getDay();
      case "quincenal":
        return getDayDiff(start, today) % 15 === 0;
      case "mensual":
        return start.getDate() === today.getDate();
      default:
        return false;
    }
  };

  const hasPaidTodayFn = (p: Prestamo) => {
    return p.pagos?.some(pago => {
      const pagoDate = new Date(pago.fecha_pago);
      pagoDate.setHours(0, 0, 0, 0);
      return pagoDate.getTime() === today.getTime();
    });
  };

  const dueToday = prestamos?.filter(p => isDueToday(p)) || [];
  
  const pendientes = dueToday.filter(p => !hasPaidTodayFn(p));
  const cobradosHoy = dueToday.filter(p => hasPaidTodayFn(p));

  const totalRecolectadoHoy = cobradosHoy.reduce((acc, prestamo) => {
    const pagosDeHoy = prestamo.pagos.filter(pago => {
      const pDate = new Date(pago.fecha_pago);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === today.getTime();
    });
    const sumaPagos = pagosDeHoy.reduce((sum, p) => sum + p.monto_pagado, 0);
    return acc + sumaPagos;
  }, 0);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrestamo || !session) return;

    const montoPago = parseFloat(paymentAmount);
    if (isNaN(montoPago) || montoPago <= 0 || montoPago > selectedPrestamo.saldo_pendiente) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setIsSubmitting(true);
    try {
      const proporcionCapital = selectedPrestamo.monto / selectedPrestamo.total_a_pagar;
      const capitalAbonado = montoPago * proporcionCapital;
      const interesPagado = montoPago - capitalAbonado;
      
      const nuevoSaldo = selectedPrestamo.saldo_pendiente - montoPago;
      const nuevoCapitalRecuperado = selectedPrestamo.capital_recuperado + capitalAbonado;
      const nuevoInteresGanado = selectedPrestamo.interes_ganado + interesPagado;
      const nuevasCuotasPagadas = selectedPrestamo.cuotas_pagadas + 1;
      const nuevoEstado = nuevoSaldo <= 0.01 ? "pagado" : selectedPrestamo.estado;

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

      const { error: prestamoError } = await supabase
        .from("prestamos")
        .update({
          saldo_pendiente: nuevoSaldo < 0 ? 0 : nuevoSaldo,
          cuotas_pagadas: nuevasCuotasPagadas,
          capital_recuperado: nuevoCapitalRecuperado,
          interes_ganado: nuevoInteresGanado,
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedPrestamo.id);

      if (prestamoError) throw prestamoError;

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
            total_recuperado: Number(configData.total_recuperado) + capitalAbonado
          })
          .eq("user_id", session.id);
      }

      toast.success(`Pago de $${montoPago} registrado a ${selectedPrestamo.clientes?.nombre}`);
      setSelectedPrestamo(null);
      setPaymentAmount("");
      
      queryClient.invalidateQueries({ queryKey: ["rutasDiarias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });

    } catch (error) {
      console.error("Error registering payment:", error);
      toast.error("Ocurrió un error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Modal de Cobro */}
      {selectedPrestamo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Cobro Rápido</h3>
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mb-6">{selectedPrestamo.clientes?.nombre}</p>
            
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
                    max={selectedPrestamo.saldo_pendiente}
                    required
                    autoFocus
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-xl font-bold text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Saldo: ${selectedPrestamo.saldo_pendiente.toFixed(2)}</span>
                  <button 
                    type="button" 
                    onClick={() => setPaymentAmount(selectedPrestamo.valor_cuota.toString())}
                    className="text-[10px] font-bold text-teal-500 hover:text-teal-600 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded-md transition-colors"
                  >
                    Sugerido: ${selectedPrestamo.valor_cuota.toFixed(2)}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPrestamo(null)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Procesando..." : "Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 space-y-6 relative z-10 pb-24">
        <header className="flex flex-col pt-2 gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Ruta de Hoy</h1>
          <p className="text-sm font-medium text-zinc-500">
            {today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Resumen del Día */}
        <section className="bg-teal-500 dark:bg-teal-500/20 rounded-[2rem] p-6 text-white shadow-[0_10px_40px_rgba(20,184,166,0.3)] dark:shadow-none border border-teal-400 dark:border-teal-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full"></div>
          <div className="relative z-10">
            <span className="text-sm font-bold text-teal-100 dark:text-teal-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Wallet size={16} /> Recolectado Hoy
            </span>
            <div className="text-5xl font-black tracking-tighter">
              ${totalRecolectadoHoy.toFixed(2)}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-teal-100 dark:text-teal-300">
              <Activity size={16} /> {cobradosHoy.length} cobros completados
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Sección Pendientes */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Por Cobrar Hoy</span>
                <span className="bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full text-xs">{pendientes.length}</span>
              </h2>

              {pendientes.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 dark:bg-white/5 rounded-3xl border border-zinc-200 dark:border-white/10 border-dashed">
                  <p className="text-sm text-zinc-500 font-medium">No hay más cobros pendientes por hoy. ¡Buen trabajo!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendientes.map(prestamo => (
                    <div key={prestamo.id} className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-sm dark:shadow-none flex flex-col gap-4">
                      <Link href={`/clientes/detalle?id=${prestamo.cliente_id}`} className="flex justify-between items-start group">
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white text-lg group-hover:text-teal-500 transition-colors">{prestamo.clientes?.nombre}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                            <MapPin size={12} />
                            <span className="line-clamp-1">{prestamo.clientes?.direccion || "Sin dirección"}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Cuota sugerida</span>
                          <span className="font-black text-zinc-900 dark:text-white text-lg">${prestamo.valor_cuota.toFixed(2)}</span>
                        </div>
                      </Link>
                      
                      <div className="flex gap-2">
                        {prestamo.clientes?.telefono && (
                          <a href={`tel:${prestamo.clientes.telefono}`} className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
                            <Phone size={18} />
                          </a>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedPrestamo(prestamo);
                            setPaymentAmount(prestamo.valor_cuota.toString());
                          }}
                          className="flex-1 h-12 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_4px_15px_rgba(20,184,166,0.3)]"
                        >
                          <DollarSign size={18} />
                          COBRAR AHORA
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sección Cobrados */}
            {cobradosHoy.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-zinc-200 dark:border-white/10">
                <h2 className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Completados Hoy</span>
                  <span className="bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full text-xs">{cobradosHoy.length}</span>
                </h2>

                <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                  {cobradosHoy.map(prestamo => {
                    const pagosDeHoy = prestamo.pagos.filter(pago => {
                      const pDate = new Date(pago.fecha_pago);
                      pDate.setHours(0, 0, 0, 0);
                      return pDate.getTime() === today.getTime();
                    });
                    const totalCobrado = pagosDeHoy.reduce((sum, p) => sum + p.monto_pagado, 0);

                    return (
                      <div key={prestamo.id} className="bg-white dark:bg-white/5 border border-teal-200 dark:border-teal-500/20 rounded-2xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <Activity size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900 dark:text-white line-through decoration-zinc-400">{prestamo.clientes?.nombre}</h3>
                            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Misión Cumplida</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-teal-600 dark:text-teal-400">+${totalCobrado.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
