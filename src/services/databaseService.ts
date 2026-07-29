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

  async getPaginated(userId: string, search: string = "", page: number = 1, pageSize: number = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("clientes")
      .select("*, prestamos(*)", { count: "exact" })
      .eq("user_id", userId)
      .order("nombre", { ascending: true })
      .range(from, to);

    if (search) {
      query = query.ilike("nombre", `%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: data as Cliente[],
      count: count || 0,
    };
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

  async create(userId: string, data: { nombre: string; telefono: string; direccion: string }) {
    const { data: result, error } = await supabase
      .from("clientes")
      .insert({
        user_id: userId,
        nombre: data.nombre,
        telefono: data.telefono,
        direccion: data.direccion,
        estado: "activo"
      })
      .select()
      .single();
    
    if (error) throw error;
    return result as Cliente;
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


export const prestamoService = {
  async getPaginated(userId: string, search: string = "", estadoFiltro: string, fechaInicio: string, fechaFin: string, page: number = 1, pageSize: number = 10) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("prestamos")
      .select(`*, clientes!inner(nombre)`, { count: "exact" })
      .eq("user_id", userId)
      .order("fecha_inicio", { ascending: false });

    if (estadoFiltro !== "todos") {
      query = query.eq("estado", estadoFiltro);
    }

    if (fechaInicio) {
      query = query.gte("fecha_inicio", fechaInicio);
    }
    if (fechaFin) {
      query = query.lte("fecha_inicio", fechaFin);
    }

    if (search) {
      query = query.ilike("clientes.nombre", `%${search}%`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data,
      count
    };
  },

  async getStats(userId: string, estadoFiltro: string, fechaInicio: string, fechaFin: string, search: string) {
    let query = supabase
      .from("prestamos")
      .select("estado, saldo_pendiente, clientes!inner(nombre)")
      .eq("user_id", userId);

    if (estadoFiltro !== "todos") {
      query = query.eq("estado", estadoFiltro);
    }

    if (fechaInicio) {
      query = query.gte("fecha_inicio", fechaInicio);
    }
    if (fechaFin) {
      query = query.lte("fecha_inicio", fechaFin);
    }

    if (search) {
      query = query.ilike("clientes.nombre", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let activos = 0;
    let pagados = 0;
    let montoPendiente = 0;

    if (data) {
        data.forEach(p => {
            if (p.estado === 'activo') activos++;
            if (p.estado === 'pagado') pagados++;
            montoPendiente += Number(p.saldo_pendiente) || 0;
        });
    }

    return {
      total: data ? data.length : 0,
      activos,
      pagados,
      montoPendiente
    };
  }
};

export const pagoService = {
  async getPaginated(userId: string, search: string = "", fechaInicio: string, fechaFin: string, page: number = 1, pageSize: number = 10) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("pagos")
      .select(`*, prestamos!inner(id, cliente_id, clientes!inner(nombre))`, { count: "exact" })
      .eq("user_id", userId)
      .order("fecha_pago", { ascending: false });

    if (fechaInicio) {
      query = query.gte("fecha_pago", fechaInicio + "T00:00:00.000Z");
    }
    if (fechaFin) {
      query = query.lte("fecha_pago", fechaFin + "T23:59:59.999Z");
    }

    if (search) {
      query = query.ilike("prestamos.clientes.nombre", `%${search}%`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data,
      count
    };
  },

  async getStats(userId: string, search: string, fechaInicio: string, fechaFin: string) {
    let query = supabase
      .from("pagos")
      .select(`monto_pagado, capital_abonado, interes_pagado, prestamos!inner(clientes!inner(nombre))`)
      .eq("user_id", userId);

    if (fechaInicio) {
      query = query.gte("fecha_pago", fechaInicio + "T00:00:00.000Z");
    }
    if (fechaFin) {
      query = query.lte("fecha_pago", fechaFin + "T23:59:59.999Z");
    }

    if (search) {
      query = query.ilike("prestamos.clientes.nombre", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let totalMonto = 0;
    let totalCapital = 0;
    let totalInteres = 0;

    if (data) {
        data.forEach(p => {
            totalMonto += Number(p.monto_pagado) || 0;
            totalCapital += Number(p.capital_abonado) || 0;
            totalInteres += Number(p.interes_pagado) || 0;
        });
    }

    return {
        total: data ? data.length : 0,
        totalMonto,
        totalCapital,
        totalInteres
    };
  }
};

export const cajaService = {
  async getCapitalDisponible(userId: string) {
    const { data, error } = await supabase
      .from("capital_config")
      .select("capital_disponible")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  async getAllMovimientos(userId: string) {
    const { data, error } = await supabase
      .from("movimientos_caja")
      .select("id, tipo, categoria, monto, descripcion, fecha, created_at")
      .eq("user_id", userId)
      .order("fecha", { ascending: false });
    if (error) throw error;
    return data;
  },

  async insertMovimiento(userId: string, tipo: string, categoria: string, monto: number, descripcion: string) {
    const { error: movError } = await supabase.from("movimientos_caja").insert({
      user_id: userId,
      tipo,
      categoria,
      monto,
      descripcion,
    });
    if (movError) throw movError;

    const { data: configData } = await supabase
      .from("capital_config")
      .select("capital_disponible")
      .eq("user_id", userId)
      .single();

    if (configData) {
      const nuevoCapital =
        tipo === "entrada"
          ? Number(configData.capital_disponible) + monto
          : Number(configData.capital_disponible) - monto;

      await supabase
        .from("capital_config")
        .update({
          capital_disponible: nuevoCapital,
        })
        .eq("user_id", userId);
    }
  }
};

export const reporteService = {
  async getDiaCorte(userId: string) {
    const { data, error } = await supabase
      .from("capital_config")
      .select("dia_corte_kpi")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  async getAllPagos(userId: string) {
    const { data, error } = await supabase
      .from("pagos")
      .select("id, prestamo_id, monto_pagado, capital_abonado, interes_pagado, numero_cuota, fecha_pago, metodo_pago")
      .eq("user_id", userId)
      .order("fecha_pago", { ascending: true });
    if (error) throw error;
    return data;
  }
};

export const rutaService = {
  async getPrestamosActivos(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("prestamos")
      .select(`
        *,
        clientes (*),
        pagos (*)
      `)
      .eq("user_id", userId)
      .or(`estado.eq.activo,and(estado.eq.pagado,updated_at.gte.${todayStart.toISOString()})`);

    if (error) throw error;
    return data;
  },

  async registrarPago(
    userId: string,
    prestamo: { id: string },
    montoPago: number,
    capitalAbonado: number,
    interesPagado: number,
    nuevoSaldo: number,
    nuevoCapitalRecuperado: number,
    nuevoInteresGanado: number,
    nuevasCuotasPagadas: number,
    nuevoEstado: string
  ) {
    const { error: pagoError } = await supabase.from("pagos").insert({
      user_id: userId,
      prestamo_id: prestamo.id,
      monto_pagado: montoPago,
      capital_abonado: capitalAbonado,
      interes_pagado: interesPagado,
      numero_cuota: nuevasCuotasPagadas,
      metodo_pago: "efectivo",
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
      .eq("id", prestamo.id);

    if (prestamoError) throw prestamoError;

    const { data: configData } = await supabase
      .from("capital_config")
      .select("capital_disponible, capital_en_calle, ganancia_total, total_recuperado")
      .eq("user_id", userId)
      .single();

    if (configData) {
      await supabase
        .from("capital_config")
        .update({
          capital_disponible: Number(configData.capital_disponible) + montoPago,
          capital_en_calle: Number(configData.capital_en_calle) - capitalAbonado,
          ganancia_total: Number(configData.ganancia_total) + interesPagado,
          total_recuperado: Number(configData.total_recuperado) + capitalAbonado,
        })
        .eq("user_id", userId);
    }
  }
};

export const dashboardService = {
  async getStats(userId: string) {
    const { data, error } = await supabase
      .from("capital_config")
      .select("id, user_id, capital_inicial, capital_disponible, capital_en_calle, ganancia_total, total_prestado, total_recuperado, dia_corte_kpi, last_cierre_kpi")
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    
    // Realizar la verificación y/o conciliación de corte de KPI
    const configData = data as CapitalConfig;
    return await checkAndPerformKPICut(configData, userId);
  }
};

export const moraService = {
  async getAll(userId: string) {
    const { data: dbMoras, error } = await supabase
      .from("moras")
      .select("*, prestamos(*, clientes(*))")
      .eq("user_id", userId)
      .order("fecha_generada", { ascending: false });
    
    if (error) throw error;

    if (dbMoras && dbMoras.length > 0) {
      return dbMoras;
    }

    return await this.calculateMorasAlVuelo(userId);
  },

  async getPendientes(userId: string) {
    const { data: dbMoras, error } = await supabase
      .from("moras")
      .select("*, prestamos(*, clientes(*))")
      .eq("user_id", userId)
      .eq("estado", "pendiente")
      .order("dias_atraso", { ascending: false });
    
    if (error) throw error;

    if (dbMoras && dbMoras.length > 0) {
      return dbMoras;
    }

    return await this.calculateMorasAlVuelo(userId);
  },

  async calculateMorasAlVuelo(userId: string) {
    const { data: prestamos, error } = await supabase
      .from("prestamos")
      .select("*, clientes(*)")
      .eq("user_id", userId)
      .eq("estado", "activo");

    if (error) throw error;
    if (!prestamos) return [];

    const morasCalculadas = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const p of prestamos) {
      if (!p.fecha_inicio) continue;
      
      const start = new Date(p.fecha_inicio + "T00:00:00");
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      let cuotasDebias = 0;
      let diasFrecuencia = 1;

      switch (p.tipo_pago) {
        case "diario":
          cuotasDebias = diffDays;
          diasFrecuencia = 1;
          break;
        case "semanal":
          cuotasDebias = Math.floor(diffDays / 7);
          diasFrecuencia = 7;
          break;
        case "quincenal":
          cuotasDebias = Math.floor(diffDays / 15);
          diasFrecuencia = 15;
          break;
        case "mensual":
          cuotasDebias = Math.floor(diffDays / 30);
          diasFrecuencia = 30;
          break;
      }

      cuotasDebias = Math.min(cuotasDebias, p.numero_cuotas);

      if (p.cuotas_pagadas < cuotasDebias) {
        const cuotasAtrasadas = cuotasDebias - p.cuotas_pagadas;
        const diasAtraso = Math.max(1, diffDays - (p.cuotas_pagadas * diasFrecuencia));
        const montoMora = cuotasAtrasadas * Number(p.valor_cuota);

        morasCalculadas.push({
          id: `calc-${p.id}`,
          user_id: userId,
          prestamo_id: p.id,
          dias_atraso: diasAtraso,
          monto_mora: montoMora,
          porcentaje_mora: 0,
          estado: "pendiente",
          fecha_generada: new Date(today.getTime() - (diasAtraso * 24 * 60 * 60 * 1000)).toISOString(),
          fecha_pagada: null,
          prestamos: {
            id: p.id,
            monto: p.monto,
            saldo_pendiente: p.saldo_pendiente,
            valor_cuota: p.valor_cuota,
            tipo_pago: p.tipo_pago,
            clientes: p.clientes
          }
        });
      }
    }

    return morasCalculadas;
  }
};
