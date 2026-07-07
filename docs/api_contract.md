# QSL DOR — Contrato de API

Este documento define todos los endpoints que el backend debe exponer
para que la web (`claude_qsldor` — las 7 páginas HTML) y la QSL App
(`qsl_app.py`) funcionen de verdad. Mientras el backend no exista,
tanto la web como la App usan datos de ejemplo (mock), marcados con
`// TODO backend` o `# TODO backend` en el código.

## Convenciones generales

- **Base URL**: `https://api.qsldor.com` (a definir cuando se despliegue)
- **Formato**: JSON en request y response
- **Autenticación**: header `Authorization: Bearer {token}` en todos los
  endpoints que requieren sesión (se indica con 🔒 en cada uno)
- **Roles**: 👤 Usuario común · 🛡️ Moderador · 👑 Admin principal · 🔧 Desarrollador
- **Errores**: siempre devuelven `{ "error": "mensaje legible" }` con el
  código HTTP correspondiente (400, 401, 403, 404, 409, 500)
- **Fechas/horas**: todo en UTC, formato ISO 8601 (`2026-07-07T14:30:00Z`)

---

## 1. Autenticación

### `POST /api/auth/registro`
Crea una cuenta nueva.
```json
// Request
{
  "callsign": "LU5REY",
  "email": "lu5rey@mail.com",
  "whatsapp": "+54911...",       // opcional
  "password": "...",
  "acepta_terminos": true,
  "acepta_compartir_contacto": true
}
// Response 201
{ "token": "...", "callsign": "LU5REY" }
```
Reglas: `callsign` único (case-insensitive), `email` único, password con
mínimo de seguridad a definir. `acepta_compartir_contacto` controla si
el mail/WhatsApp se puede mostrar a otros usuarios con match confirmado.

### `POST /api/auth/login`
```json
// Request
{ "callsign": "LU5REY", "password": "..." }
// Response 200
{ "token": "...", "callsign": "LU5REY", "rol": "usuario" }
// rol puede ser: usuario | moderador | admin | desarrollador
```

### `POST /api/auth/recuperar-password`
```json
// Request
{ "email": "lu5rey@mail.com" }
// Response 200 — siempre responde OK, no revela si el mail existe o no
{ "mensaje": "Si el mail existe, vas a recibir instrucciones." }
```

### `POST /api/auth/logout` 🔒
Invalida el token actual (si se maneja server-side; si son JWT stateless,
este endpoint puede no ser necesario y el logout es solo local).

---

## 2. Usuario / Perfil

### `GET /api/usuario/perfil` 🔒
```json
{
  "callsign": "LU5REY",
  "email": "...",
  "whatsapp": "...",
  "fecha_registro": "2026-03-01T00:00:00Z",
  "cantidad_ingresos": 47,
  "clan": { "id": "clan_001", "nombre": "La Hermandad del Éter", "rol": "cacique" },
  "cooldown_hasta": null
}
```

### `PUT /api/usuario/perfil` 🔒
Actualiza email/whatsapp/consentimiento de contacto/contraseña.

### `GET /api/usuario/estadisticas` 🔒
```json
{
  "contactos_confirmados": 94,
  "contactos_pendientes": 34,
  "medallas_totales": 19,
  "clan": "La Hermandad del Éter",
  "companeros_clan_en_linea": 2,
  "proxima_medalla": { "nombre": "Maestro de 20m", "faltan": 6 },
  "racha_actual_dias": 6,
  "racha_record_dias": 21,
  "posicion_ranking": 7
}
```

### `GET /api/usuario/historial-adif` 🔒
Devuelve el archivo ADIF completo del usuario (confirmados + pendientes)
para descarga directa. `Content-Type: application/octet-stream` o similar.

### `GET /api/usuario/publico/:callsign`
Perfil público (sin login), para el buscador de indicativos y las
páginas de perfil compartibles. Solo datos no sensibles: medallas, clan,
estadísticas generales — nunca mail/whatsapp.

---

## 3. Contactos / ADIF / Matching

### `POST /api/adif/subir` 🔒
Usado tanto por la subida manual (web y App) como por el escaneo
automático de carpeta.
```json
// Request
{
  "contactos": [
    { "call": "LW7DXX", "band": "40m", "mode": "SSB", "qso_date": "20260628", "time_on": "2114", "name": "Marcelo" }
  ]
}
// Response 200
{ "recibidos": 1, "nuevos_matches": 0 }
```
El backend es responsable de: deduplicar contra lo ya guardado de ese
usuario, y correr el algoritmo de matching contra el resto de la base
(tolerancia de horario configurable, ver sección 8).

### `POST /api/contactos/rapido` 🔒
Usado por el formulario de "carga rápida" (web y App). La hora la pone
el backend (o el cliente, en UTC) al momento de recibir la request.
```json
// Request
{ "call": "LW7DXX", "band": "20m", "mode": "SSB", "name": "Marcelo" }
// Response 200
{ "guardado": true, "hora_registrada": "2026-07-07T14:32:00Z" }
```

### `GET /api/contactos?estado=match|pendiente|todos` 🔒
Lista paginada de contactos del usuario, para la vista "Mis contactos"
del Panel y de la App.

### `GET /api/matches` 🔒
Matches confirmados, con los datos de contacto del otro operador
**solo si ambos aceptaron compartirlos**.
```json
[
  {
    "id": "match_001",
    "indicativo": "LW7DXX",
    "banda": "40m",
    "modo": "SSB",
    "fecha": "2026-06-28",
    "whatsapp": "https://wa.me/...",
    "mail": "lw7dxx@mail.com"
  }
]
```

---

## 4. Clanes

### `POST /api/clanes` 🔒
Crea un clan nuevo (el creador queda como Cacique automáticamente).
```json
{ "nombre": "Los 40m", "escudo_id": "aguila_dorada" }
```
Falla con 409 si el usuario está en cooldown o ya pertenece a un clan.

### `GET /api/clanes/:id`
Datos públicos del clan: nombre, escudo, miembros y sus roles, medallas
grupales conseguidas.

### `DELETE /api/clanes/:id` 🔒
Solo el Cacique puede disolver el clan. Si tiene miembros, todos quedan
libres **sin cooldown** (decisión ya validada con el equipo).

### `POST /api/clanes/:id/solicitar-ingreso` 🔒
Un usuario pide entrar. Falla con 409 si está en cooldown.

### `POST /api/clanes/:id/responder-solicitud` 🔒 (Cacique)
```json
{ "usuario_id": "...", "aceptar": true }
```

### `POST /api/clanes/:id/expulsar` 🔒 (Cacique)
```json
{ "usuario_id": "..." }
```
Dispara el cooldown configurado para el usuario expulsado.

### `POST /api/clanes/:id/salir` 🔒
El usuario se va voluntariamente. Dispara el cooldown.

### `POST /api/clanes/:id/asignar-rol` 🔒 (Cacique)
```json
{ "usuario_id": "...", "rol": "consejero|guerrero|aprendiz" }
```
Nota: estos roles son etiquetas sin lógica de permisos propia — el
único flag funcional es `es_cacique`.

### `GET /api/clan/en-linea` 🔒
Para el heartbeat de la App: qué compañeros de clan tienen la App
abierta ahora mismo.

### `POST /api/clan/heartbeat` 🔒
La App llama esto periódicamente para marcarse como "activa".

---

## 5. Medallas / Museo / Ranking

### `GET /api/medallas`
Catálogo completo de medallas (público, sin login) — alimenta la
página Museo. Devuelve lo mismo que hoy está hardcodeado en el JS de
`museo.html`, para que en el futuro se administre desde la base y no
desde el código.

### `GET /api/usuario/medallas` 🔒
Medallas ya conseguidas por el usuario logueado.

### `GET /api/ranking/usuarios?periodo=mensual|historico`
Top operadores por cantidad/rareza de medallas.

### `GET /api/ranking/clanes?periodo=mensual|historico`

### `GET /api/stats/globales`
Alimenta los 4 números de la home (contactos confirmados, países,
operadores activos, clanes en pie).

---

## 6. Eventos

### `GET /api/eventos?filtro=publico|privado|pasado`
Lista de eventos para la Cartelera.

### `POST /api/eventos/solicitar` 🔒
Un usuario/Cacique pide que se publique un evento (queda pendiente de
aprobación del Admin/Moderador).
```json
{
  "titulo": "Día de activación en 40m",
  "fecha": "2026-07-15",
  "hora_utc": "16:00",
  "banda": "40m",
  "modo": "SSB",
  "visibilidad": "publico|solo_clan",
  "descripcion": "..."
}
```

### `POST /api/eventos/:id/confirmar-asistencia` 🔒
Para recibir el aviso 7 días antes por Telegram.

---

## 7. Solicitudes / Soporte (bandeja del Admin)

### `POST /api/solicitudes` 🔒
El formulario de "Escribile al Admin" de la página Ayuda.
```json
{
  "motivo": "evento|publicidad|reporte|otro",
  "mensaje": "..."
}
```

### `GET /api/admin/solicitudes?estado=pendiente|proceso|resuelto` 🔒 🛡️👑
### `PUT /api/admin/solicitudes/:id` 🔒 🛡️👑
```json
{ "estado": "aprobado|rechazado|proceso", "respuesta_admin": "..." }
```

---

## 8. Administración

### `GET /api/admin/parametros` 🔒 👑
### `PUT /api/admin/parametros` 🔒 👑
```json
{
  "tolerancia_matching_minutos": 15,
  "dias_espera_cacique_inactivo": 5,
  "dias_cooldown_clan": 30,
  "max_miembros_clan": 10
}
```

### `GET /api/admin/novedades-clanes` 🔒 🛡️👑
Historial de expulsiones, salidas y sucesiones, para dar contexto.

### `GET /api/admin/usuarios/:callsign` 🔒 👑
### `POST /api/admin/usuarios/:callsign/liberar-cooldown` 🔒 👑
### `POST /api/admin/usuarios/:callsign/suspender` 🔒 👑

### `POST /api/admin/medallas/otorgar` 🔒 👑
```json
{ "tipo": "usuario|clan", "destinatario_id": "...", "medalla_id": "...", "motivo": "..." }
```

### `GET /api/admin/moderadores` 🔒 👑
### `POST /api/admin/moderadores` 🔒 👑
```json
{ "callsign": "LW7DXX" }
```
### `DELETE /api/admin/moderadores/:callsign` 🔒 👑

---

## 9. Diplomas

### `GET /api/diplomas/plantillas` 🔒
Lista de plantillas disponibles, con su URL real en Cloudflare R2.
```json
[
  { "id": "clasico_dorado", "nombre": "Clásico Dorado", "url": "https://r2.qsldor.com/plantillas/clasico_dorado.svg" }
]
```
El armado final del diploma (SVG + datos del contacto → imagen) ocurre
**en el cliente** (web o App), nunca en el backend — así que no hace
falta ningún endpoint de "generar diploma".

---

## 10. Notas de implementación para el backend

- **Matching**: se dispara en `POST /api/adif/subir` y en
  `POST /api/contactos/rapido`. Compara el contacto nuevo contra
  **todo el historial** de la otra parte (no solo lo reciente), usando
  la tolerancia horaria configurable. Ver capítulo de diseño ya
  acordado: el match solo cuenta para medallas cuando está confirmado
  por ambos lados.
- **Medallas**: se recalculan como reacción a cada match confirmado
  nuevo, no con un job corriendo todo el tiempo.
- **Deduplicación de contactos**: por contenido (call+band+mode+fecha+hora),
  nunca por nombre de archivo — mismo criterio ya implementado en el
  parser local de la QSL App (`adif_utils.py`).
- **Seguridad**: contraseñas siempre hasheadas (bcrypt/argon2), nunca
  en texto plano ni en el código fuente.