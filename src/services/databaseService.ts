import { supabase } from "@/lib/supabase/client";
import { Cliente, CapitalConfig } from "@/types/database";

export const clienteService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, prestamos(*)")
      .eq("user_id", userId)
      .order("nombre", { ascending: true });
    
    if (error) throw error;
    return data as Cliente[];
  },

  async getById(id: string, userId: string) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, prestamos(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    return data as Cliente;
  },

  async create(cliente: Omit<Cliente, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("clientes")
      .insert(cliente)
      .select()
      .single();
    
    if (error) throw error;
    return data as Cliente;
  }
};

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function getKPIMetrics(userId: string, start: Date, end?: Date) {
  // 1. Obtener pagos en el período
  let pagosQuery = supabase
    .from("pagos")
    .select("monto_pagado, capital_abonado, interes_pagado")
    .eq("user_id", userId)
    .gte("fecha_pago", start.toISOString());
    
  if (end) {
    pagosQuery = pagosQuery.lt("fecha_pago", end.toISOString());
  }
  
  const { data: pagos, error: pagosErr } = await pagosQuery;
  if (pagosErr) throw pagosErr;

  let ganancia_total = 0;
  let total_recuperado = 0;
  pagos?.forEach(p => {
    ganancia_total += Number(p.interes_pagado) || 0;
    total_recuperado += Number(p.capital_abonado) || 0;
  });

  // 2. Obtener préstamos en el período (fecha_inicio es tipo date 'YYYY-MM-DD')
  let prestamosQuery = supabase
    .from("prestamos")
    .select("monto")
    .eq("user_id", userId)
    .gte("fecha_inicio", formatDateToYYYYMMDD(start));
    
  if (end) {
    prestamosQuery = prestamosQuery.lt("fecha_inicio", formatDateToYYYYMMDD(end));
  }

  const { data: prestamos, error: prestamosErr } = await prestamosQuery;
  if (prestamosErr) throw prestamosErr;

  let total_prestado = 0;
  prestamos?.forEach(p => {
    total_prestado += Number(p.monto) || 0;
  });

  return {
    ganancia_total,
    total_recuperado,
    total_prestado
  };
}

async function checkAndPerformKPICut(config: CapitalConfig, userId: string): Promise<CapitalConfig> {
  const diaCorte = config.dia_corte_kpi;
  if (!diaCorte) return config;

  const now = new Date();
  
  // Calcular la fecha del corte más reciente que debió haber ocurrido
  let corteMasReciente: Date;
  if (now.getDate() >= diaCorte) {
    corteMasReciente = new Date(now.getFullYear(), now.getMonth(), diaCorte, 0, 0, 0, 0);
  } else {
    corteMasReciente = new Date(now.getFullYear(), now.getMonth() - 1, diaCorte, 0, 0, 0, 0);
  }

  const corteMasRecienteStr = formatDateToYYYYMMDD(corteMasReciente);

  // Determinar si es necesario realizar el cierre y la fecha de inicio del período
  let necesitaCierre = false;
  let periodoInicio: Date;

  if (!config.last_cierre_kpi) {
    necesitaCierre = true;
    if (config.created_at) {
      periodoInicio = new Date(config.created_at);
      periodoInicio = new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), periodoInicio.getDate(), 0, 0, 0, 0);
    } else {
      periodoInicio = new Date(corteMasReciente);
      periodoInicio.setMonth(periodoInicio.getMonth() - 1);
    }
  } else {
    const parts = config.last_cierre_kpi.split('-');
    if (parts.length === 3) {
      periodoInicio = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
    } else {
      periodoInicio = new Date(config.last_cierre_kpi);
      periodoInicio = new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), periodoInicio.getDate(), 0, 0, 0, 0);
    }

    const corteMasRecienteNormalized = new Date(corteMasReciente.getFullYear(), corteMasReciente.getMonth(), corteMasReciente.getDate(), 0, 0, 0, 0);
    
    if (periodoInicio.getTime() < corteMasRecienteNormalized.getTime()) {
      necesitaCierre = true;
    }
  }

  if (!necesitaCierre) {
    // Reconciliación: verificar que los KPIs acumulados en capital_config coincidan con las transacciones reales
    try {
      const metricsActuales = await getKPIMetrics(userId, periodoInicio);
      
      if (
        Number(config.ganancia_total) !== metricsActuales.ganancia_total ||
        Number(config.total_prestado) !== metricsActuales.total_prestado ||
        Number(config.total_recuperado) !== metricsActuales.total_recuperado
      ) {
        console.log(`[KPI Reconcile] Discrepancia detectada para el usuario ${userId}. Recalculando...`, {
          actual_config: {
            ganancia_total: config.ganancia_total,
            total_prestado: config.total_prestado,
            total_recuperado: config.total_recuperado
          },
          recalculated: metricsActuales
        });

        const { data: updatedConfig, error: updateError } = await supabase
          .from("capital_config")
          .update({
            ganancia_total: metricsActuales.ganancia_total,
            total_prestado: metricsActuales.total_prestado,
            total_recuperado: metricsActuales.total_recuperado,
            updated_at: new Date().toISOString()
          })
          .eq("id", config.id)
          .select()
          .single();

        if (!updateError && updatedConfig) {
          return updatedConfig as CapitalConfig;
        }
      }
    } catch (err) {
      console.error("[KPI Reconcile] Error reconciliando KPIs del período actual:", err);
    }
    return config;
  }

  console.log(`[KPI Cut] Realizando cierre de KPI para el usuario ${userId} al corte ${corteMasRecienteStr}`);

  try {
    const periodoInicioStr = formatDateToYYYYMMDD(periodoInicio);

    // 1. Verificar si ya existe el registro de historial de KPI para este corte y usuario
    const { data: existingHistorial, error: checkError } = await supabase
      .from("kpi_historial")
      .select("id")
      .eq("user_id", userId)
      .eq("periodo_fin", corteMasRecienteStr)
      .maybeSingle();

    if (checkError) {
      console.error("[KPI Cut] Error al verificar historial de KPI existente:", checkError);
    }

    if (!existingHistorial) {
      // 2. Calcular los KPIs del período que finaliza con consultas directas
      const metricsCierre = await getKPIMetrics(userId, periodoInicio, corteMasReciente);

      // 3. Insertar el historial de KPI
      const { error: insertError } = await supabase
        .from("kpi_historial")
        .insert({
          user_id: userId,
          periodo_inicio: periodoInicioStr,
          periodo_fin: corteMasRecienteStr,
          ganancia_total: metricsCierre.ganancia_total,
          total_prestado: metricsCierre.total_prestado,
          total_recuperado: metricsCierre.total_recuperado,
          capital_en_calle: config.capital_en_calle || 0,
        });

      if (insertError) {
        throw new Error(`Error al insertar en kpi_historial: ${insertError.message}`);
      }
      console.log(`[KPI Cut] Historial insertado con éxito para ${periodoInicioStr} a ${corteMasRecienteStr}:`, metricsCierre);
    } else {
      console.log(`[KPI Cut] El historial de KPI para el corte ${corteMasRecienteStr} ya existe. Saltando inserción.`);
    }

    // 4. Calcular los KPIs del nuevo período (desde corteMasReciente hasta el momento actual)
    const metricsActuales = await getKPIMetrics(userId, corteMasReciente);

    // 5. Actualizar capital_config reseteando a las métricas del nuevo período
    const { data: updatedConfig, error: updateError } = await supabase
      .from("capital_config")
      .update({
        ganancia_total: metricsActuales.ganancia_total,
        total_prestado: metricsActuales.total_prestado,
        total_recuperado: metricsActuales.total_recuperado,
        last_cierre_kpi: corteMasRecienteStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error al actualizar capital_config: ${updateError.message}`);
    }

    console.log("[KPI Cut] Cierre de KPI y carga del nuevo período exitosa:", metricsActuales);
    return updatedConfig as CapitalConfig;

  } catch (err) {
    console.error("[KPI Cut] Error ejecutando el cierre de KPI:", err);
    return config;
  }
}

export const dashboardService = {
  async getStats(userId: string) {
    const { data, error } = await supabase
      .from("capital_config")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    
    // Realizar la verificación y/o conciliación de corte de KPI
    const configData = data as CapitalConfig;
    return await checkAndPerformKPICut(configData, userId);
  }
};
