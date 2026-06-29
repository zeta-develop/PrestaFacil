# PrestaFacil 📱💰

**PrestaFacil** es una aplicación multiplataforma (Web y Móvil) diseñada para la administración y control de préstamos, clientes, cobros diarios, gestión de caja y planificación de rutas de cobro. Está pensada para facilitar el trabajo de prestamistas y cobradores, ofreciendo indicadores en tiempo real y la capacidad de operar en dispositivos móviles de forma nativa.

---

## 🛠️ Tecnologías Utilizadas

El proyecto está construido sobre un stack moderno y eficiente:

- **Frontend & Routing:** [Next.js 16 (App Router)](file:///home/zeta/Documentos/proyectos/PrestaFacil/src/app) con React 19.
- **Estilos:** [Tailwind CSS v4](file:///home/zeta/Documentos/proyectos/PrestaFacil/postcss.config.mjs) para un diseño responsivo y moderno.
- **Base de Datos & Auth:** [Supabase](https://supabase.com) (PostgreSQL con políticas RLS y autenticación por email).
- **Manejador de Estado del Servidor:** [TanStack React Query v5](https://tanstack.com/query/latest) para caché y sincronización eficiente de datos.
- **Empaquetado Móvil:** [Capacitor v8](file:///home/zeta/Documentos/proyectos/PrestaFacil/capacitor.config.ts) para compilar la aplicación web en una app Android nativa.
- **Reportes:** [jsPDF](https://github.com/parallax/jsPDF) para la generación de recibos de pago en PDF.

---

## ✨ Características Principales

1. **Dashboard & KPIs:** Monitoreo en tiempo real de capital inicial, capital disponible, capital en la calle, ganancias estimadas, total cobrado y tasas de mora.
2. **Gestión de Clientes:** Registro detallado de clientes con estados de cuenta consolidados (activos/inactivos).
3. **Control de Préstamos:** 
   - Cálculo automático de cuotas y fechas de vencimiento esperadas.
   - Frecuencias de pago flexibles: diario, semanal, quincenal y mensual.
   - Seguimiento del saldo pendiente, capital recuperado e interés ganado.
4. **Registro de Pagos:** Abonos automatizados distribuidos en capital e intereses con soporte para efectivo, transferencia u otros medios, además de generación de comprobantes PDF.
5. **Rutas de Cobro:** Creación de rutas de visitas organizadas por día de la semana y orden de prioridad para optimizar el recorrido del cobrador.
6. **Movimientos de Caja:** Registro clasificado de entradas y salidas (gastos operativos, inyección de capital, retiros de ganancia y desembolsos).

---

## 📂 Estructura del Proyecto

La estructura de carpetas principal es la siguiente:

- 📁 [src/app](file:///home/zeta/Documentos/proyectos/PrestaFacil/src/app): Rutas de la aplicación (Dashboard, Clientes, Préstamos, Caja, Pagos, Rutas, Perfil, Reportes).
- 📁 [src/components](file:///home/zeta/Documentos/proyectos/PrestaFacil/src/components): Componentes compartidos de la interfaz (formularios, layouts, UI reutilizable).
- 📁 [src/lib](file:///home/zeta/Documentos/proyectos/PrestaFacil/src/lib): Clientes de servicios externos y utilidades comunes (e.g. Supabase client).
- 📁 [src/services](file:///home/zeta/Documentos/proyectos/PrestaFacil/src/services): Lógica de comunicación con la base de datos y negocio (API wrapper).
- 📁 [src/types](file:///home/zeta/Documentos/proyectos/PrestaFacil/src/types): Definición de tipos TypeScript para garantizar seguridad en tiempo de desarrollo.
- 📄 [database_schema.sql](file:///home/zeta/Documentos/proyectos/PrestaFacil/database_schema.sql): Script con la estructura completa de base de datos (tablas, constraints, y llaves foráneas).
- 📄 [capacitor.config.ts](file:///home/zeta/Documentos/proyectos/PrestaFacil/capacitor.config.ts): Configuración del entorno móvil de Capacitor.

---

## ⚙️ Configuración del Entorno

Para ejecutar la aplicación localmente, debes configurar las credenciales de Supabase en un archivo local.

1. Crea un archivo [.env.local](file:///home/zeta/Documentos/proyectos/PrestaFacil/.env.local) en la raíz del proyecto.
2. Agrega las siguientes variables con las credenciales de tu proyecto de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<TU-PROJECT-ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU-ANON-KEY>
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=<TU-SERVICE-ROLE-KEY>
```

---

## 🚀 Instalación y Desarrollo Local

Sigue estos pasos para poner en marcha el entorno de desarrollo:

### 1. Clonar el repositorio e instalar dependencias

Puedes usar **pnpm** (recomendado por la presencia del workspace) o **npm**:

```bash
# Con pnpm
pnpm install

# Con npm
npm install
```

### 2. Base de Datos

Ejecuta el script SQL que se encuentra en [database_schema.sql](file:///home/zeta/Documentos/proyectos/PrestaFacil/database_schema.sql) en el editor SQL de tu panel de Supabase para inicializar las tablas necesarias.

### 3. Iniciar el servidor de desarrollo

```bash
# Con pnpm
pnpm dev

# Con npm
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

## 📱 Compilación Móvil (Android)

La aplicación está optimizada para exportarse de manera estática y ser compilada con Capacitor.

### 1. Construir la versión de producción (HTML Estático)

El build de Next.js generará los archivos exportados en la carpeta `out/` gracias a la configuración `output: 'export'` en [next.config.ts](file:///home/zeta/Documentos/proyectos/PrestaFacil/next.config.ts):

```bash
# Con pnpm
pnpm build

# Con npm
npm run build
```

### 2. Sincronizar el contenido web con Android

Transfiere los archivos de la carpeta `out/` al entorno de Android nativo:

```bash
npx cap sync
```

### 3. Abrir el proyecto en Android Studio

Abre el entorno nativo en Android Studio para depurar, probar en un emulador o generar el APK de producción:

```bash
npx cap open android
```

---

## 👥 Roles de Usuario

El sistema cuenta con un control de accesos básico definido en la tabla de perfiles:
- **Cobrador:** Permite visualizar clientes, registrar pagos en ruta y consultar estado de préstamos asignados.
- **Admin:** Control total sobre la configuración de capital, reportería avanzada, edición de KPIs y reestructuración de rutas.
