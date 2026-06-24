export type ClienteEstado = "activo" | "inactivo";

export interface Cliente {
  id: string;
  user_id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  estado: ClienteEstado;
  created_at?: string;
  prestamos?: Prestamo[];
}

export type PrestamoEstado = "activo" | "pagado" | "cancelado" | "vencido";

export interface Prestamo {
  id: string;
  user_id: string;
  cliente_id: string;
  monto: number;
  interes: number;
  plazo: number;
  fecha_inicio: string;
  saldo_pendiente: number;
  valor_cuota: number;
  numero_cuotas: number;
  cuotas_pagadas: number;
  total_a_pagar: number;
  capital_recuperado: number;
  interes_ganado: number;
  estado: PrestamoEstado;
  created_at?: string;
  clientes?: Cliente;
}

export interface Pago {
  id: string;
  user_id: string;
  prestamo_id: string;
  monto: number;
  fecha_pago: string;
  notas?: string;
  created_at?: string;
}

export interface CapitalConfig {
  id: string;
  user_id: string;
  capital_inicial: number;
  capital_disponible: number;
  capital_en_calle: number;
  ganancia_total: number;
  total_prestado: number;
  total_recuperado: number;
  dia_corte_kpi: number;
  last_cierre_kpi?: string | null;
  created_at?: string;
  updated_at?: string;
}

