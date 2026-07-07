// lib/db.js
// Conexión reutilizable a PostgreSQL (Aiven). Next.js puede reiniciar
// este módulo entre peticiones en desarrollo, así que guardamos el
// pool en una variable global para no abrir conexiones de más.

import { Pool } from "pg";

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "Falta la variable de entorno DATABASE_URL. Revisá tu .env.local (en desarrollo) o la configuración de Environment Variables en Vercel (en producción)."
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Aiven requiere SSL
    });
  }
  return pool;
}
