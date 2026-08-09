/**
 * Tests para pagoService.eliminarUltimoPago usando el mock local de Supabase.
 * Ejecutar con: node --import tsx --test tests/eliminarUltimoPago.test.ts
 */
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { __resetDb, __seed, db, mockSupabase } from "../src/lib/supabase/mockClient.ts";
import { pagoService } from "../src/services/databaseService.ts";

const USER_ID = "user-1";
const PRESTAMO_ID = "loan-1";

function seedData(overrides: { estado?: string; cuotasPagadas?: number } = {}) {
  __resetDb();
  __seed("clientes", [{ id: "cliente-1", user_id: USER_ID, nombre: "Test Cliente", telefono: "88888888", direccion: "X", estado: "activo" }]);
  __seed("prestamos", [
    {
      id: PRESTAMO_ID,
      user_id: USER_ID,
      cliente_id: "cliente-1",
      monto: 1000,
      interes: 20,
      plazo: 4,
      fecha_inicio: "2026-08-01",
      saldo_pendiente: 600,
      valor_cuota: 300,
      numero_cuotas: 4,
      cuotas_pagadas: overrides.cuotasPagadas ?? 2,
      total_a_pagar: 1200,
      capital_recuperado: 350,
      interes_ganado: 250,
      estado: overrides.estado ?? "activo",
      created_at: "2026-08-01T10:00:00.000Z",
    },
  ]);
  __seed("pagos", [
    {
      id: "pago-1",
      user_id: USER_ID,
      prestamo_id: PRESTAMO_ID,
      monto_pagado: 300,
      capital_abonado: 250,
      interes_pagado: 50,
      numero_cuota: 1,
      metodo_pago: "efectivo",
      fecha_pago: "2026-08-02T10:00:00.000Z",
      created_at: "2026-08-02T10:00:00.000Z",
    },
    {
      id: "pago-2",
      user_id: USER_ID,
      prestamo_id: PRESTAMO_ID,
      monto_pagado: 300,
      capital_abonado: 100,
      interes_pagado: 200,
      numero_cuota: 2,
      metodo_pago: "efectivo",
      fecha_pago: "2026-08-04T10:00:00.000Z",
      created_at: "2026-08-04T10:00:00.000Z",
    },
  ]);
  __seed("capital_config", [
    {
      id: "cfg-1",
      user_id: USER_ID,
      capital_inicial: 1000,
      capital_disponible: 500,
      capital_en_calle: 650,
      ganancia_total: 250,
      total_prestado: 1000,
      total_recuperado: 350,
      dia_corte_kpi: 15,
    },
  ]);
}

function getPrestamo() {
  return db.prestamos.find((p) => p.id === PRESTAMO_ID)!;
}

function getCapitalConfig() {
  return db.capital_config.find((c) => c.user_id === USER_ID)!;
}

describe("pagoService.eliminarUltimoPago", () => {
  beforeEach(() => __resetDb());

  test("elimina el pago con mayor numero_cuota y revierte el préstamo", async () => {
    seedData();

    const eliminado = await pagoService.eliminarUltimoPago(USER_ID, PRESTAMO_ID);

    assert.equal(eliminado.id, "pago-2");

    // El pago fue eliminado de la tabla
    assert.equal(db.pagos.length, 1);
    assert.equal(db.pagos[0].id, "pago-1");

    // Préstamo revertido
    const prestamo = getPrestamo();
    assert.equal(prestamo.saldo_pendiente, 600 + 300); // + monto del último pago
    assert.equal(prestamo.cuotas_pagadas, 1);
    assert.equal(prestamo.capital_recuperado, 350 - 100);
    assert.equal(prestamo.interes_ganado, 250 - 200);
    assert.equal(prestamo.estado, "activo");
  });

  test("revierte capital_config correctamente", async () => {
    seedData();

    await pagoService.eliminarUltimoPago(USER_ID, PRESTAMO_ID);

    const cfg = getCapitalConfig();
    // pago-2: monto 300, capital 100, interes 200
    assert.equal(cfg.capital_disponible, 500 - 300);
    assert.equal(cfg.capital_en_calle, 650 + 100);
    assert.equal(cfg.ganancia_total, 250 - 200);
    assert.equal(cfg.total_recuperado, 350 - 100);
  });

  test("si el préstamo estaba pagado, vuelve a activo", async () => {
    seedData({ estado: "pagado", cuotasPagadas: 4 });

    await pagoService.eliminarUltimoPago(USER_ID, PRESTAMO_ID);

    const prestamo = getPrestamo();
    assert.equal(prestamo.estado, "activo");
    assert.equal(prestamo.cuotas_pagadas, 3);
  });

  test("lanza error si no hay pagos registrados", async () => {
    seedData();
    db.pagos = [];

    await assert.rejects(
      () => pagoService.eliminarUltimoPago(USER_ID, PRESTAMO_ID),
      /No hay pagos registrados para eliminar/
    );
  });

  test("lanza error si el préstamo no pertenece al usuario", async () => {
    seedData();
    await assert.rejects(
      () => pagoService.eliminarUltimoPago("otro-user", PRESTAMO_ID),
      (err: any) => /No rows found/i.test(String(err?.message ?? err))
    );
  });
});
