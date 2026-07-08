import { useState } from "react";

export default function Test() {
  const [callsign, setCallsign] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function llamar(endpoint, body) {
    setCargando(true);
    setResultado(null);
    try {
      const respuesta = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await respuesta.json();
      setResultado({ status: respuesta.status, data });
    } catch (error) {
      setResultado({ status: "error", data: { error: String(error) } });
    }
    setCargando(false);
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, maxWidth: 500 }}>
      <h1>🧪 Página de prueba — Auth</h1>
      <p style={{ color: "#666" }}>
        Esto es solo para probar que el backend habla con la base de datos.
        No es la web final (esa sigue en el repo <code>web/</code>).
      </p>

      <div style={{ marginTop: 20 }}>
        <label>Indicativo</label>
        <br />
        <input
          value={callsign}
          onChange={(e) => setCallsign(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <label>Email (solo para registro)</label>
        <br />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <label>Contraseña</label>
        <br />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 16 }}
        />

        <button
          disabled={cargando}
          onClick={() =>
            llamar("registro", {
              callsign,
              email,
              password,
              acepta_compartir_contacto: true,
            })
          }
          style={{ marginRight: 10, padding: "8px 16px" }}
        >
          Probar Registro
        </button>

        <button
          disabled={cargando}
          onClick={() => llamar("login", { callsign, password })}
          style={{ padding: "8px 16px" }}
        >
          Probar Login
        </button>
      </div>

      {resultado && (
        <pre
          style={{
            marginTop: 20,
            background: "#f4f4f4",
            padding: 16,
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          Status: {resultado.status}
          {"\n\n"}
          {JSON.stringify(resultado.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
