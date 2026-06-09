# Deploy de TuAgendaYa en Render

Guía para publicar el backend (API + SQLite persistente) y el frontend (React/Vite) en [Render](https://render.com).

---

## Arquitectura en producción

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  tuagendaya-web     │  HTTPS  │  tuagendaya-api              │
│  (Static Site)      │ ──────► │  (Web Service Node.js)       │
│  React + Vite       │  /api   │  Express + SQLite            │
└─────────────────────┘         │  Disco: /var/data/*.db       │
                                └──────────────────────────────┘
                                              │
                                              ▼
                                WhatsApp Cloud API (Meta)
```

---

## Requisitos previos

1. Cuenta en [Render](https://render.com)
2. Repositorio Git (GitHub / GitLab) con el código de TuAgendaYa
3. (Opcional) Cuenta [Meta for Developers](https://developers.facebook.com/) para WhatsApp Cloud API

---

## Paso 1 — Subir el código a Git

```bash
cd TuAgendaYa
git init
git add .
git commit -m "TuAgendaYa — listo para Render"
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

---

## Paso 2 — Deploy del backend (API)

### Opción A: Blueprint automático (`render.yaml`)

1. En Render → **New** → **Blueprint**
2. Conectá el repositorio
3. Render detectará `render.yaml` y creará ambos servicios
4. Completá las variables marcadas como `sync: false` (ver tabla abajo)

### Opción B: Manual

1. **New** → **Web Service**
2. Conectá el repo
3. Configuración:

| Campo | Valor |
|-------|-------|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

4. **Disco persistente** (obligatorio para que SQLite no se borre en cada deploy):
   - Settings → **Disks** → Add Disk
   - Mount Path: `/var/data`
   - Size: 1 GB (mínimo)
   - **Nota:** el disco persistente requiere plan **Starter** o superior en Render (no disponible en Free).

---

## Paso 3 — Variables de entorno del backend

Configurá en Render → tu servicio API → **Environment**:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NODE_ENV` | Sí | `production` |
| `PORT` | Sí | `10000` (Render lo inyecta; podés dejarlo) |
| `JWT_SECRET` | Sí | Mínimo 32 caracteres. Generá uno seguro: |
| | | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CORS_ORIGIN` | Sí | URL del frontend, ej: `https://tuagendaya-web.onrender.com` |
| `DATABASE_PATH` | Sí | `/var/data/tuagendaya.db` |
| `ADMIN_EMAIL` | Sí | Email del administrador inicial |
| `ADMIN_PASSWORD` | Sí | Contraseña admin (mín. 8 caracteres) |
| `WHATSAPP_TOKEN` | No | Token permanente de Meta Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | No | ID del número de WhatsApp Business |
| `WHATSAPP_API_VERSION` | No | Default: `v21.0` |
| `SEED_DEMO` | No | `true` solo si querés el usuario demo en producción |

### WhatsApp Cloud API (Meta)

1. Creá una app en [Meta for Developers](https://developers.facebook.com/)
2. Agregá el producto **WhatsApp**
3. En WhatsApp → **API Setup** obtené:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **Temporary access token** (o token permanente del System User) → `WHATSAPP_TOKEN`
4. Agregá el número de teléfono de prueba del cliente en Meta (modo desarrollo) o verificá tu negocio (producción)
5. Reiniciá el servicio en Render tras guardar las variables

Sin WhatsApp configurado, los mensajes se registran en logs como `[WhatsApp simulado]` — la app sigue funcionando.

### Twilio (alternativa)

Si preferís Twilio en lugar de Cloud API:

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+...
```

Cloud API tiene prioridad si `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` están definidos.

---

## Paso 4 — Deploy del frontend

1. **New** → **Static Site**
2. Conectá el mismo repositorio
3. Configuración:

| Campo | Valor |
|-------|-------|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

4. Variable de entorno **antes del primer build**:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | URL pública del backend, ej: `https://tuagendaya-api.onrender.com` |

> **Importante:** `VITE_API_URL` se embebe en el build. Si cambiás la URL del API, debés hacer **Manual Deploy** del frontend.

5. En **Redirects/Rewrites** (para React Router):

| Source | Destination |
|--------|-------------|
| `/*` | `/index.html` |

(Esto ya está en `render.yaml` y en `frontend/public/_redirects`.)

---

## Paso 5 — Vincular CORS

Una vez tengas la URL del frontend (ej. `https://tuagendaya-web.onrender.com`):

1. Volvé al servicio **API** en Render
2. Actualizá `CORS_ORIGIN` con esa URL exacta (sin barra final)
3. Si tenés dominio propio, separá con coma:
   ```
   https://tuagendaya-web.onrender.com,https://www.tudominio.com
   ```
4. Guardá → Render redeployará automáticamente

---

## Paso 6 — Verificar el deploy

### API

```bash
curl https://tuagendaya-api.onrender.com/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "TuAgendaYa",
  "environment": "production",
  "database": { "connected": true, "path": "/var/data/tuagendaya.db" },
  "whatsapp": "cloud"
}
```

`whatsapp` puede ser: `cloud`, `twilio` o `simulated`.

### Frontend

Abrí `https://tuagendaya-web.onrender.com` y probá:

1. Listado de profesionales
2. Reservar un turno
3. Login en `/profesional/login` con el admin o un profesional registrado
4. Panel admin en `/admin/login`

---

## Paso 7 — Primer acceso admin

El admin se crea automáticamente al arrancar la API con las variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Solo se crea si no existe. Cambiá la contraseña tras el primer login editando la variable y recreando el admin manualmente en BD si fuera necesario.

---

## Desarrollo local (referencia)

```bash
# Terminal 1 — API
cd backend
cp .env.example .env
# Editá .env con JWT_SECRET, ADMIN_PASSWORD, etc.
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Local: http://localhost:5173 — API: http://localhost:3001

---

## Seguridad en producción (incluida en Fase 1)

| Control | Implementación |
|---------|----------------|
| Validación de env obligatorias | `backend/config/env.js` |
| JWT_SECRET fuerte requerido | Mín. 32 chars, sin valores por defecto |
| CORS restringido | Solo orígenes en `CORS_ORIGIN` |
| Helmet (headers HTTP) | `backend/middleware/security.js` |
| Rate limiting | Auth y reservas |
| Sin usuario demo en prod | Solo si `SEED_DEMO=true` |
| SQLite en disco persistente | `DATABASE_PATH=/var/data/...` |
| Health check | `GET /api/health` |
| Logs | `backend/logs/app.log` |

---

## Troubleshooting

### La API arranca pero pierde datos tras cada deploy

→ No montaste el disco persistente o `DATABASE_PATH` no apunta a `/var/data/tuagendaya.db`.

### Error al arrancar: "Variables de entorno obligatorias"

→ Faltan `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` o `DATABASE_PATH`.

### El frontend no conecta con la API

→ Verificá `VITE_API_URL` y que `CORS_ORIGIN` en el backend incluya la URL del frontend. Re-build del frontend si cambiaste `VITE_API_URL`.

### CORS error en el navegador

→ `CORS_ORIGIN` debe coincidir exactamente con el origen (protocolo + dominio, sin path).

### WhatsApp no envía mensajes

→ Revisá logs del servicio API en Render. Verificá token, Phone Number ID y que el número del cliente esté autorizado en Meta (modo sandbox).

### El plan Free de Render apaga el servicio

→ El primer request tras inactividad tarda ~30s (cold start). Para producción real usá plan **Starter** o superior.

---

## Checklist pre-lanzamiento

- [ ] `JWT_SECRET` generado aleatoriamente (48+ chars)
- [ ] `ADMIN_PASSWORD` fuerte (no `admin123`)
- [ ] Disco persistente montado en `/var/data`
- [ ] `DATABASE_PATH=/var/data/tuagendaya.db`
- [ ] `CORS_ORIGIN` con URL real del frontend
- [ ] `VITE_API_URL` apuntando al API en Render
- [ ] Health check responde `200`
- [ ] WhatsApp Cloud API configurado (o aceptás modo simulado)
- [ ] `SEED_DEMO` **no** está en `true` en producción
- [ ] Probado flujo completo de reserva en URL pública

---

## Estructura de archivos relevantes

```
TuAgendaYa/
├── render.yaml              # Blueprint Render (API + frontend)
├── DEPLOY.md                # Esta guía
├── backend/
│   ├── .env.example         # Variables documentadas
│   ├── config/env.js        # Validación producción
│   ├── middleware/security.js
│   ├── services/whatsappCloud.js
│   └── server.js
└── frontend/
    ├── .env.production.example
    └── public/_redirects    # SPA fallback
```
