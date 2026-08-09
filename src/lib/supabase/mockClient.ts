/**
 * Cliente Supabase simulado en memoria.
 *
 * SOLO se usa en entornos de prueba/desarrollo cuando NO existen
 * credenciales reales (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * No reemplaza la arquitectura real de conexión: si las credenciales existen,
 * client.ts exporta el cliente real de @supabase/supabase-js.
 *
 * Implementa el subconjunto de la API usado por la app:
 * from().select() .eq() .gte() .lte() .lt() .ilike() .order() .range()
 * .single() .maybeSingle() .insert().select().single() .update().eq() .delete().eq()
 */

type Row = Record<string, any>;
type FilterFn = (row: Row) => boolean;
type Operation = "select" | "insert" | "update" | "delete";

// Base de datos en memoria
export const db: Record<string, Row[]> = {
  clientes: [],
  prestamos: [],
  pagos: [],
  capital_config: [],
  movimientos_caja: [],
  moras: [],
  kpi_historial: [],
};

let idCounter = 1;

export function __resetDb() {
  Object.keys(db).forEach((k) => (db[k] = []));
  idCounter = 1;
}

export function __seed(table: string, rows: Row[]) {
  db[table] = rows.map((r) => ({ ...r }));
}

function genId() {
  return `mock-${String(idCounter++).padStart(4, "0")}`;
}

/** Interpreta un select con joins simples del estilo "*, pagos(*)" o "clientes!inner(nombre)". */
function parseSelect(selectStr: string | undefined) {
  const joins: { table: string; cols: string[] | "*"; required: boolean }[] = [];
  const localCols: string[] = [];

  if (!selectStr || selectStr === "*") return { localCols: null, joins };

  for (const part of selectStr.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const joinMatch = p.match(/^(\w+)(?:!inner)?\((.+)\)$/);
    if (joinMatch) {
      joins.push({
        table: joinMatch[1],
        cols: joinMatch[2].trim() === "*" ? "*" : joinMatch[2].split(",").map((c) => c.trim()),
        required: p.includes("!inner"),
      });
    } else {
      localCols.push(p);
    }
  }
  return { localCols, joins };
}

/** Une filas relacionadas (pagos -> prestamos -> clientes). */
function applyJoins(row: Row, table: string, joins: { table: string; cols: string[] | "*"; required: boolean }[]): Row | null {
  const result = { ...row };
  for (const join of joins) {
    const relTable = join.table;
    const relRows = db[relTable] || [];
    let related: Row[] = [];
    if (table === "prestamos" && relTable === "pagos") {
      related = relRows.filter((r) => r.prestamo_id === row.id);
    } else if (table === "pagos" && relTable === "prestamos") {
      const p = relRows.find((r) => r.id === row.prestamo_id);
      if (p) {
        const nested = applyJoins(p, "prestamos", [
          { table: "clientes", cols: "*", required: false },
        ]);
        if (nested) related = [nested];
      }
    } else if (table === "prestamos" && relTable === "clientes") {
      const c = relRows.find((r) => r.id === row.cliente_id);
      if (c) related = [c];
    } else if (table === "clientes" && relTable === "prestamos") {
      related = relRows.filter((r) => r.cliente_id === row.id);
    } else if (table === "moras" && relTable === "prestamos") {
      const p = relRows.find((r) => r.id === row.prestamo_id);
      if (p) {
        const nested = applyJoins(p, "prestamos", [
          { table: "clientes", cols: "*", required: false },
        ]);
        if (nested) related = [nested];
      }
    }

    if (join.cols === "*") {
      result[relTable] = related;
    } else {
      const cols = join.cols as string[];
      if (related.length > 0) {
        result[relTable] = related.map((r) => {
          const picked: Row = {};
          cols.forEach((c) => (picked[c] = r[c]));
          return picked;
        });
      }
    }
    if (join.required && (!related || related.length === 0)) {
      return null; // inner join: fila se descarta
    }
  }
  return result;
}

function pickCols(row: Row, cols: string[] | null) {
  if (!cols || cols.includes("*")) return { ...row };
  const out: Row = {};
  cols.forEach((c) => {
    if (c in row) out[c] = row[c];
  });
  return out;
}

class MockQueryBuilder {
  private filters: FilterFn[] = [];
  private sortCol: string | null = null;
  private sortAsc = true;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private selectStr = "*";
  private countMode = false;
  private operation: Operation = "select";
  private pendingValues: Row | Row[] | null = null;
  private executedResult: { data: Row[]; count?: number } | null = null;

  constructor(private table: string) {}

  select(cols: string, opts?: { count?: "exact" }) {
    this.selectStr = cols;
    if (opts?.count === "exact") this.countMode = true;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push((r) => (r[col] == null ? false : r[col] > val));
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push((r) => (r[col] == null ? false : r[col] >= val));
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push((r) => (r[col] == null ? false : r[col] < val));
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push((r) => (r[col] == null ? false : r[col] <= val));
    return this;
  }

  ilike(col: string, pattern: string) {
    const regex = new RegExp(
      "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$",
      "i"
    );
    this.filters.push((r) => regex.test(String(r[col] ?? "")));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sortCol = col;
    this.sortAsc = opts?.ascending ?? true;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(n: number) {
    this.rangeFrom = 0;
    this.rangeTo = n - 1;
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = "insert";
    this.pendingValues = values;
    return this;
  }

  update(values: Row) {
    this.operation = "update";
    this.pendingValues = values;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  /** Ejecuta la operación pendiente (o un select) y devuelve filas filtradas/afectadas. */
  private execute() {
    if (this.executedResult) return this.executedResult;

    const rows = this.filteredRows();

    if (this.operation === "insert") {
      const arr = Array.isArray(this.pendingValues) ? this.pendingValues : [this.pendingValues!];
      const inserted = arr.map((v) => {
        const row: Row = { ...v, id: v.id ?? genId(), created_at: v.created_at ?? new Date().toISOString() };
        db[this.table].push(row);
        return row;
      });
      this.executedResult = { data: inserted };
      return this.executedResult;
    }

    if (this.operation === "update") {
      rows.forEach((r) => Object.assign(r, this.pendingValues as Row));
      this.executedResult = { data: rows };
      return this.executedResult;
    }

    if (this.operation === "delete") {
      const ids = new Set(rows.map((r) => r.id));
      db[this.table] = db[this.table].filter((r) => !ids.has(r.id));
      this.executedResult = { data: rows };
      return this.executedResult;
    }

    // select
    const total = rows.length;
    let selected = rows;
    if (this.rangeFrom != null && this.rangeTo != null) {
      selected = rows.slice(this.rangeFrom, this.rangeTo + 1);
    }
    const { localCols, joins } = parseSelect(this.selectStr);
    const data: Row[] = [];
    for (const r of selected) {
      const joined = applyJoins(r, this.table, joins);
      if (joined === null) continue; // inner join sin match
      data.push(pickCols(joined, localCols));
    }
    this.executedResult = { data, count: this.countMode ? total : undefined };
    return this.executedResult;
  }

  private filteredRows() {
    let rows = [...(db[this.table] || [])];
    for (const f of this.filters) rows = rows.filter(f);

    if (this.sortCol) {
      rows.sort((a, b) => {
        const av = a[this.sortCol!];
        const bv = b[this.sortCol!];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return this.sortAsc ? av - bv : bv - av;
        }
        const cmp = String(av).localeCompare(String(bv));
        return this.sortAsc ? cmp : -cmp;
      });
    }
    return rows;
  }

  async single() {
    const { data } = this.execute();
    if (data.length === 0) {
      return { data: null, error: { message: "No rows found", code: "PGRST116", details: "", hint: "" } };
    }
    return { data: data[0], error: null };
  }

  async maybeSingle() {
    const { data } = this.execute();
    return { data: data[0] ?? null, error: null };
  }

  /** Permite `await query` para operaciones select/insert/update/delete. */
  then(resolve: any, reject?: any) {
    const { data, count } = this.execute();
    return Promise.resolve({ data, error: null, count }).then(resolve, reject);
  }
}

class MockSupabaseClient {
  from(table: string) {
    return new MockQueryBuilder(table);
  }

  // Stub mínimo de auth para que la app pueda cargar sin backend real.
  auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: "Auth simulado: sin backend" } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  };
}

export const mockSupabase = new MockSupabaseClient();
