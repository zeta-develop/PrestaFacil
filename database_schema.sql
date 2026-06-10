-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text DEFAULT 'cobrador'::text CHECK (role = ANY (ARRAY['admin'::text, 'cobrador'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.capital_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  capital_inicial numeric DEFAULT 0,
  capital_disponible numeric DEFAULT 0,
  capital_en_calle numeric DEFAULT 0,
  ganancia_total numeric DEFAULT 0,
  total_prestado numeric DEFAULT 0,
  total_recuperado numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  dia_corte_kpi integer NOT NULL DEFAULT 1 CHECK (dia_corte_kpi >= 1 AND dia_corte_kpi <= 28),
  last_cierre_kpi timestamp with time zone,
  CONSTRAINT capital_config_pkey PRIMARY KEY (id),
  CONSTRAINT capital_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  telefono text,
  direccion text,
  notas text,
  estado text DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id),
  CONSTRAINT clientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.prestamos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  monto numeric NOT NULL,
  porcentaje_interes numeric NOT NULL,
  total_a_pagar numeric NOT NULL,
  ganancia_esperada numeric NOT NULL,
  tipo_pago text NOT NULL CHECK (tipo_pago = ANY (ARRAY['diario'::text, 'semanal'::text, 'quincenal'::text, 'mensual'::text])),
  numero_cuotas integer NOT NULL,
  valor_cuota numeric NOT NULL,
  cuotas_pagadas integer DEFAULT 0,
  saldo_pendiente numeric NOT NULL,
  capital_recuperado numeric DEFAULT 0,
  interes_ganado numeric DEFAULT 0,
  fecha_inicio date NOT NULL,
  fecha_fin_esperada date,
  estado text DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'pagado'::text, 'vencido'::text, 'cancelado'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prestamos_pkey PRIMARY KEY (id),
  CONSTRAINT prestamos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT prestamos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);
CREATE TABLE public.pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prestamo_id uuid NOT NULL,
  monto_pagado numeric NOT NULL,
  capital_abonado numeric NOT NULL,
  interes_pagado numeric NOT NULL,
  fecha_pago timestamp with time zone DEFAULT now(),
  numero_cuota integer,
  metodo_pago text DEFAULT 'efectivo'::text CHECK (metodo_pago = ANY (ARRAY['efectivo'::text, 'transferencia'::text, 'otro'::text])),
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pagos_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT pagos_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id)
);
CREATE TABLE public.rutas_cobro (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  dia_semana text CHECK (dia_semana = ANY (ARRAY['lunes'::text, 'martes'::text, 'miercoles'::text, 'jueves'::text, 'viernes'::text, 'sabado'::text, 'domingo'::text])),
  activa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rutas_cobro_pkey PRIMARY KEY (id),
  CONSTRAINT rutas_cobro_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.clientes_rutas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  ruta_id uuid NOT NULL,
  orden integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clientes_rutas_pkey PRIMARY KEY (id),
  CONSTRAINT clientes_rutas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT clientes_rutas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT clientes_rutas_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.rutas_cobro(id)
);
CREATE TABLE public.moras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prestamo_id uuid NOT NULL,
  dias_atraso integer NOT NULL,
  monto_mora numeric NOT NULL,
  porcentaje_mora numeric DEFAULT 0,
  estado text DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagada'::text])),
  fecha_generada timestamp with time zone DEFAULT now(),
  fecha_pagada timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT moras_pkey PRIMARY KEY (id),
  CONSTRAINT moras_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT moras_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id)
);
CREATE TABLE public.movimientos_caja (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['entrada'::text, 'salida'::text])),
  categoria text NOT NULL CHECK (categoria = ANY (ARRAY['pago_cliente'::text, 'desembolso_prestamo'::text, 'inyeccion_capital'::text, 'retiro_ganancia'::text, 'gasto_operativo'::text, 'otro'::text])),
  monto numeric NOT NULL,
  descripcion text,
  referencia_id uuid,
  referencia_tipo text CHECK (referencia_tipo = ANY (ARRAY['prestamo'::text, 'pago'::text, 'cliente'::text])),
  fecha timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_caja_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.kpi_historial (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  ganancia_total numeric NOT NULL DEFAULT 0,
  total_prestado numeric NOT NULL DEFAULT 0,
  total_recuperado numeric NOT NULL DEFAULT 0,
  capital_en_calle numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT kpi_historial_pkey PRIMARY KEY (id),
  CONSTRAINT kpi_historial_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
