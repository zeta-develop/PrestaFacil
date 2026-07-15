## Resumen Ejecutivo

Como parte de la auditoría de rendimiento de la plataforma PrestaFácil, se detectó un cuello de botella silencioso pero importante en las funciones de formateo financiero y de fechas. La instanciación repetitiva de la API de Internacionalización (`Intl`) dentro de bucles o listados puede degradar sustancialmente el rendimiento (CPU) de los clientes en dispositivos móviles. Esta optimización reutiliza las instancias en el módulo central de formateo para ahorrar ciclos de procesamiento.

## Hallazgos

1.  **Múltiples instanciaciones de Intl:** Las funciones utilitarias `formatCurrency`, `formatDate` y `formatDateWithTime` en `src/lib/formatters.ts` invocaban repetidamente a `new Intl.NumberFormat(...)` y `new Intl.DateTimeFormat(...)` en cada llamada. Esto resulta ser una operación costosa en términos de rendimiento cuando estas funciones se utilizan para iterar sobre listas largas, como los historiales de pagos, listas de deudores y moras en el frontend de PrestaFácil.

## Mejoras implementadas

*   **Cacheo de instanciaciones Intl:** Se han extraído y refactorizado las instancias de `Intl.NumberFormat` e `Intl.DateTimeFormat` al nivel de módulo en `src/lib/formatters.ts`. De esta manera, el objeto se instancia una sola vez cuando el motor evalúa el script, y luego es reutilizado a lo largo del ciclo de vida de la aplicación.
*   Esto proveerá una leve pero consistente mejora de rendimiento (frames y ciclos de CPU reducidos) en todas las pantallas donde se pintan múltiples monedas o fechas en pantalla.

## Archivos modificados

- `src/lib/formatters.ts`

## Riesgos

**Nulo / Bajo.** Es un simple cambio a nivel de módulo, la lógica interna y las opciones pasadas a los formateadores (`Intl`) siguen siendo exactamente las mismas. No altera ni la estructura visual ni la funcionalidad lógica.

## Cómo validar los cambios

1.  **Navegación general:** Ingresar a las secciones de la aplicación donde se despliegan listas con fechas y precios, tales como "Clientes", "Caja", "Pagos" o "Reportes".
2.  **Verificar compilación:** Se validó que el código no posee errores de lint y su proceso de build pasa sin contratiempos con `pnpm run build`.

## Recomendaciones a futuro

*   **Consultas a base de datos (Selects vs Views):** Aunque no cubierto en este commit por estar centrado en micro-optimizaciones, se notó un exceso de consultas con `.select(*)` y cruces anidados en transacciones financieras en los formularios de Nuevo Préstamo/Pago. Sería ideal implementar Procedimientos Almacenados o vistas.
