import postgres from "postgres";

let sql: postgres.Sql | undefined;

// Lazily created so that `next build` and unit tests never need a database.
export function getSql(): postgres.Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    sql = postgres(url, {
      // Neon's pooled endpoint runs PgBouncer in transaction mode.
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
    });
  }
  return sql;
}

export async function closeSql(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = undefined;
  }
}
