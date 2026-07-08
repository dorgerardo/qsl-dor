import { Pool } from "pg";

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "Falta la variable de entorno DATABASE_URL. Revisá tu .env.local (en desarrollo) o la configuración de Environment Variables en Vercel (en producción)."
      );
    }

    // Importante: sacamos cualquier "?sslmode=require" del final de la URL.
    // Si lo dejamos, la librería "pg" arma su propia configuración de SSL
    // a partir de eso con validación estricta del certificado, y esa
    // configuración pisa la que ponemos explícitamente abajo (ssl:
    // { rejectUnauthorized: false }). Eso es justo lo que causaba el
    // error "self-signed certificate in certificate chain" con Aiven.
    const connectionString = process.env.DATABASE_URL.split("?")[0];

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Aiven usa certificado propio, no de una CA pública
    });
  }
  return pool;
}
