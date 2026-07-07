// pages/api/auth/login.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { callsign, password } = req.body || {};

  if (!callsign || !password) {
    return res.status(400).json({ error: "Faltan indicativo o contraseña." });
  }

  const pool = getPool();

  try {
    const resultado = await pool.query(
      "SELECT id, callsign, password_hash, rol, suspendido FROM usuarios WHERE UPPER(callsign) = UPPER($1)",
      [callsign]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: "Indicativo o contraseña incorrectos." });
    }

    const usuario = resultado.rows[0];

    if (usuario.suspendido) {
      return res.status(403).json({ error: "Esta cuenta está suspendida. Contactá al Admin." });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: "Indicativo o contraseña incorrectos." });
    }

    // Actualiza cantidad de ingresos y última conexión
    await pool.query(
      "UPDATE usuarios SET cantidad_ingresos = cantidad_ingresos + 1, ultima_conexion = now() WHERE id = $1",
      [usuario.id]
    );

    if (!process.env.JWT_SECRET) {
      throw new Error("Falta la variable de entorno JWT_SECRET.");
    }

    const token = jwt.sign(
      { usuario_id: usuario.id, callsign: usuario.callsign, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      token,
      callsign: usuario.callsign,
      rol: usuario.rol,
    });
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    return res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
}