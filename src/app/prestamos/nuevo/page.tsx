"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CustomSelect from "@/components/CustomSelect";
import { ArrowLeft, Calculator, User, DollarSign, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Cliente {
  id: string;
  nombre: string;
}

interface Prestamo {
  id: string;
  saldo_pendiente: number;
}

export default function NuevoPrestamoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [deudasActivas, setDeudasActivas] = useState<number>(0);
  const [prestamosPendientes, setPrestamosPendientes] = useState<Prestamo[]>([]);
  const [descontarDeuda, setDescontarDeuda] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_id: "",
    monto_prestado: "",
    porcentaje_interes: "20",
    frecuencia_pago: "diario",
    cantidad_cuotas: "24",
  });

  // Calculate fields dynamically
  const monto = parseFloat(formData.monto_prestado) || 0;
  const interes = parseFloat(formData.porcentaje_interes) || 0;
  const cuotas = parseInt(formData.cantidad_cuotas) || 1;
  
  // Monto neto (descontando deuda si está habilitado)
  const montoNeto = descontarDeuda ? Math.max(monto - deudasActivas, 0) : monto;
  const totalPagar = montoNeto + (montoNeto * (interes / 100));
  const cuotaMonto = totalPagar / cuotas;

  useEffect(() => {
    const fetchClientes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("user_id", user.id)
        .order("nombre");
      
      if (data) setClientes(data);
    };
    fetchClientes();
  }, []);

  // Obtener deudas activas cuando se selecciona cliente
  useEffect(() => {
    const fetchDeudasActivas = async () => {
      if (!formData.cliente_id) {
        setDeudasActivas(0);
        setPrestamosPendientes([]);
        setDescontarDeuda(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("prestamos")
        .select("id, saldo_pendiente")
        .eq("user_id", user.id)
        .eq("cliente_id", formData.cliente_id)
        .eq("estado", "activo");

      if (error) {
        console.error("Error fetching deudas:", error);
        return;
      }

      if (data && data.length > 0) {
        const totalDeuda = data.reduce((sum, p) => sum + p.saldo_pendiente, 0);
        setDeudasActivas(totalDeuda);
        setPrestamosPendientes(data);
      } else {
        setDeudasActivas(0);
        setPrestamosPendientes([]);
        setDescontarDeuda(false);
      }
    };

    fetchDeudasActivas();
  }, [formData.cliente_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || monto <= 0) {
      toast.warning("Completa los datos correctamente.");
      return;
    }

    // Validar que si se descuenta deuda, el monto sea suficiente
    if (descontarDeuda && monto < deudasActivas) {
      toast.error(`El monto debe ser mayor a ${deudasActivas.toFixed(2)} para cubrir la deuda`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el config de capital actual
      const { data: configData } = await supabase
        .from("capital_config")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Si se descuenta deuda, primero pagar los préstamos pendientes
      if (descontarDeuda && deudasActivas > 0 && prestamosPendientes.length > 0) {
        let montoPorDescontar = deudasActivas;

        // Procesar cada préstamo pendiente
        for (const prestamoAnterior of prestamosPendientes) {
          if (montoPorDescontar <= 0) break;

          // Obtener detalles completos del préstamo anterior
          const { data: prestamoData } = await supabase
            .from("prestamos")
            .select("*")
            .eq("id", prestamoAnterior.id)
            .single();

          if (!prestamoData) continue;

          const montoADescontar = Math.min(montoPorDescontar, prestamoAnterior.saldo_pendiente);

          // Calcular proporción de capital e interés
          const proporcionCapital = prestamoData.monto / prestamoData.total_a_pagar;
          const capitalAbonado = montoADescontar * proporcionCapital;
          const interesPagado = montoADescontar - capitalAbonado;

          // Crear registro de pago
          await supabase.from("pagos").insert({
            user_id: user.id,
            prestamo_id: prestamoAnterior.id,
            monto_pagado: montoADescontar,
            capital_abonado: capitalAbonado,
            interes_pagado: interesPagado,
            numero_cuota: prestamoData.cuotas_pagadas + 1,
            metodo_pago: "descuento_nuevo_prestamo"
          });

          // Actualizar préstamo anterior
          const nuevoSaldo = prestamoData.saldo_pendiente - montoADescontar;
          const nuevoEstado = nuevoSaldo <= 0.01 ? "pagado" : "activo";

          await supabase
            .from("prestamos")
            .update({
              saldo_pendiente: Math.max(nuevoSaldo, 0),
              cuotas_pagadas: prestamoData.cuotas_pagadas + 1,
              capital_recuperado: prestamoData.capital_recuperado + capitalAbonado,
              interes_ganado: prestamoData.interes_ganado + interesPagado,
              estado: nuevoEstado
            })
            .eq("id", prestamoAnterior.id);

          montoPorDescontar -= montoADescontar;

          // Mostrar notificación de pago descuento
          toast.success(`Pago descuento aplicado a préstamo anterior: $${montoADescontar.toFixed(2)}`);
        }
      }

      // Create loan matching the exact schema
      const { error: loanError } = await supabase.from("prestamos").insert({
        user_id: user.id,
        cliente_id: formData.cliente_id,
        monto: montoNeto,
        porcentaje_interes: interes,
        total_a_pagar: totalPagar,
        ganancia_esperada: totalPagar - montoNeto,
        tipo_pago: formData.frecuencia_pago,
        numero_cuotas: cuotas,
        valor_cuota: cuotaMonto,
        cuotas_pagadas: 0,
        saldo_pendiente: totalPagar,
        capital_recuperado: 0,
        interes_ganado: 0,
        fecha_inicio: new Date().toISOString().split("T")[0],
        estado: "activo"
      });

      if (loanError) throw loanError;

      // Actualizar el capital_config en BD
      if (configData) {
        const { error: updateError } = await supabase
          .from("capital_config")
          .update({
            capital_disponible: Number(configData.capital_disponible) - montoNeto,
            capital_en_calle: Number(configData.capital_en_calle) + montoNeto,
            total_prestado: Number(configData.total_prestado) + montoNeto
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating capital_config:", updateError);
          throw updateError;
        }

        // Actualizar el caché de React Query INMEDIATAMENTE para evitar parpadeos de datos viejos
        queryClient.setQueryData(["dashboardData", user.id], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            capital_disponible: Number(old.capital_disponible) - montoNeto,
            capital_en_calle: Number(old.capital_en_calle) + montoNeto,
            total_prestado: Number(old.total_prestado) + montoNeto
          };
        });
      }

      // Invalidar cache para asegurar sincronización en background
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });

      toast.success("Préstamo registrado exitosamente");
      router.push("/");
    } catch (error) {
      console.error("Error creating prestamo:", error);
      toast.error("Error al registrar el préstamo");
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
          <h1 className="text-xl font-bold text-white">Nuevo Préstamo</h1>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Crear Registro</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
            <User size={14} /> Cliente
          </label>
          <CustomSelect
            options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
            value={formData.cliente_id}
            onChange={(val) => setFormData({ ...formData, cliente_id: val })}
            placeholder="Seleccionar Cliente..."
            theme="teal"
          />
        </section>

        {/* Alerta de Deudas Activas */}
        {deudasActivas > 0 && (
          <section className="rounded-3xl bg-orange-500/10 border border-orange-500/30 p-4 space-y-3 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400">Cliente con Deuda Activa</h4>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
                  Este cliente tiene {prestamosPendientes.length} préstamo(s) activo(s) con saldo pendiente.
                </p>
              </div>
            </div>

            {/* Monto de Deuda */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white/5 rounded-xl p-3 border border-orange-500/20">
                <span className="text-xs text-orange-600/80 dark:text-orange-400/80">Deuda Total Pendiente</span>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">
                  ${deudasActivas.toFixed(2)}
                </div>
              </div>
              {descontarDeuda && montoNeto !== monto && (
                <div className="bg-white/5 rounded-xl p-3 border border-teal-500/20">
                  <span className="text-xs text-teal-600/80 dark:text-teal-400/80">Monto Neto</span>
                  <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-1">
                    ${montoNeto.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox Descontar */}
            <label className="flex items-center gap-3 cursor-pointer mt-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={descontarDeuda}
                onChange={(e) => setDescontarDeuda(e.target.checked)}
                className="w-4 h-4 rounded border-orange-500/50 accent-orange-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Descontar deuda del nuevo préstamo
              </span>
            </label>

            {descontarDeuda && monto >= deudasActivas && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
                <CheckCircle2 size={14} />
                <span>Deuda será completamente liquidada</span>
              </div>
            )}
            {descontarDeuda && monto < deudasActivas && (
              <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 p-2 rounded-lg">
                <AlertCircle size={14} />
                <span>El monto debe ser mayor a ${deudasActivas.toFixed(2)} para liquidar la deuda</span>
              </div>
            )}
          </section>
        )}

        {/* Monto e Interés */}
        <div className="grid grid-cols-2 gap-4">
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
              <DollarSign size={14} /> Monto
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.monto_prestado}
              onChange={(e) => setFormData({ ...formData, monto_prestado: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white backdrop-blur-md"
            />
          </section>

          <section className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
              <Calculator size={14} /> Interés (%)
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.porcentaje_interes}
              onChange={(e) => setFormData({ ...formData, porcentaje_interes: e.target.value })}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white backdrop-blur-md"
            />
          </section>
        </div>

        {/* Frecuencia y Cuotas */}
        <div className="grid grid-cols-2 gap-4">
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
              <Calendar size={14} /> Frecuencia
            </label>
            <CustomSelect
              options={[
                { value: "diario", label: "Diario" },
                { value: "semanal", label: "Semanal" },
                { value: "quincenal", label: "Quincenal" },
                { value: "mensual", label: "Mensual" },
              ]}
              value={formData.frecuencia_pago}
              onChange={(val) => setFormData({ ...formData, frecuencia_pago: val })}
              theme="teal"
            />
          </section>

          <section className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1">
              Cuotas
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.cantidad_cuotas}
              onChange={(e) => setFormData({ ...formData, cantidad_cuotas: e.target.value })}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white backdrop-blur-md"
            />
          </section>
        </div>

        {/* Resumen Calculado */}
        <section className="rounded-3xl bg-gradient-to-br from-teal-500/10 to-teal-900/10 border border-teal-500/20 p-5 backdrop-blur-md space-y-4">
          <h3 className="text-xs font-medium text-teal-400 uppercase tracking-widest text-center">Resumen del Préstamo</h3>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Total a pagar:</span>
            <span className="text-lg font-bold text-white">${totalPagar.toFixed(2)}</span>
                    {descontarDeuda && deudasActivas > 0 && (
                      <div className="flex justify-between items-center text-sm pt-3 border-t border-orange-500/20">
                        <span className="text-zinc-400">Descuento (Deuda):</span>
                        <span className="text-lg font-bold text-orange-500">-${deudasActivas.toFixed(2)}</span>
                      </div>
                    )}
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Monto de cuota:</span>
            <span className="text-lg font-bold text-white">${cuotaMonto.toFixed(2)}</span>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-4 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(20,184,166,0.4)] mt-4"
        >
          {loading ? "Registrando..." : "Crear Préstamo"}
        </button>
      </form>
    </main>
  );
}
