// pages/api/auth/registro.js
import bcrypt from "bcryptjs";
import { getPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { callsign, email, whatsapp, password, acepta_compartir_contacto } = req.body || {};

  // ---- Validaciones básicas ----
  if (!callsign || !email || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios (indicativo, email, contraseña)." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const pool = getPool();

  try {
    // ¿Ya existe ese indicativo o ese mail?
    const existente = await pool.query(
      "SELECT id FROM usuarios WHERE UPPER(callsign) = UPPER($1) OR email = $2",
      [callsign, email]
    );
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese indicativo o ese email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios (callsign, email, whatsapp, password_hash, acepta_compartir_contacto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, callsign, email, rol`,
      [callsign.toUpperCase(), email, whatsapp || null, passwordHash, !!acepta_compartir_contacto]
    );

    const usuario = resultado.rows[0];

    return res.status(201).json({
      mensaje: "Cuenta creada correctamente.",
      usuario: { id: usuario.id, callsign: usuario.callsign, email: usuario.email, rol: usuario.rol },
    });
  } catch (error) {
    console.error("Error en /api/auth/registro:", error);
    return res.status(500).json({ error: "Error interno al crear la cuenta." });
  }
}
