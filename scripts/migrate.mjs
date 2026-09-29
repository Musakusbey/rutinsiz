// Applies db/schema.sql to DATABASE_URL (or DATABASE_URL_TEST with --test).
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const useTest = process.argv.includes("--test");
const envName = useTest ? "DATABASE_URL_TEST" : "DATABASE_URL";
const url = process.env[envName];

if (!url) {
  console.error(`${envName} is not set. Add it to .env.local (see .env.example).`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql.file(fileURLToPath(new URL("../db/schema.sql", import.meta.url)));
  const [{ count }] = await sql`select count(*)::int as count from service_requests`;
  console.log(`Schema applied to ${envName}. service_requests rows: ${count}`);
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
