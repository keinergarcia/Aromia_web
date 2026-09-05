<p align="center">
  <img src="public/logo.png" alt="AROMIA Logo" width="150"/>
</p>

<h1 align="center">AROMIA Web</h1>

<p align="center">
  Portal oficial y sistema de licencias de <strong>AROMIA Desktop</strong> — la plataforma de gestión de productos aromáticos.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Supabase-2.45-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/React_Router-6.28-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router"/>
  <img src="https://img.shields.io/badge/Lucide-0.45-000000?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide"/>
</p>

---

## Descripción

**AROMIA Web** es la plataforma web que acompaña a **AROMIA Desktop**, un sistema de gestión de productos aromáticos. Este proyecto proporciona:

- **Landing page** pública con información sobre el producto, características, beneficios, capturas de pantalla, FAQ y contacto.
- **Sistema de autenticación** completo: registro, inicio de sesión, recuperación y restablecimiento de contraseña.
- **Panel de usuario** privado con perfil, estado de cuenta, descargas, licencia y dispositivos.
- **Panel de administración** para gestionar licencias (crear, renovar, suspender, revocar), buscar clientes y administrar dispositivos (desactivar/reactivar).
- **Sistema de licenciamiento** con Edge Functions de Supabase, firma Ed25519 y validación de licencias.
- **Distribución del instalador**: AROMIA Desktop 1.0.0 (Windows x64) disponible desde el panel de usuario.

---

## Estado

| Fase | Estado |
|------|--------|
| Fase 1 — Base web (landing, auth, panel usuario) | Implementada |
| Fase 2 — Sistema de licenciamiento (Edge Functions, panel admin, firma Ed25519) | Implementada |
| Distribución del instalador (AROMIA Desktop 1.0.0, Windows x64) | Publicada |

---

## Instalador de AROMIA Desktop

La última versión estable de **AROMIA Desktop** está publicada y disponible
para descargar desde el panel de usuario.

| Dato | Valor |
|---|---|
| Versión | **1.0.0** |
| Publicado | 04/09/2026 |
| Plataforma | Windows (x64) |
| Tamaño | 54.1 MB |
| Archivo | `public/Aromia-Setup-1.0.0.exe` |
| Descarga (requiere sesión) | `/dashboard/descargas` |

El instalador se activa con la clave de licencia emitida desde el panel admin,
valida la licencia en línea contra las Edge Functions de AROMIA y conserva un
período de gracia sin conexión.

---

## Estructura del proyecto

```
├── public/                  # Estáticos (favicon, logo) e instalador del Desktop
├── src/
│   ├── components/
│   │   ├── auth/            # ProtectedRoute, AdminRoute, AuthCard
│   │   ├── dashboard/       # PageHeader, ComingSoonSection
│   │   ├── public/          # Hero, Features, Benefits, Screenshots, FAQ, Contact…
│   │   └── ui/              # Sistema de diseño (Button, Input, Card, Badge, Alert, Logo…)
│   ├── contexts/AuthContext.tsx
│   ├── layouts/             # PublicLayout, AuthLayout, DashboardLayout, AdminLayout
│   ├── lib/
│   │   ├── supabase/client.ts  # Cliente público (solo anon key)
│   │   ├── admin.ts            # Capa de acceso a Edge Functions admin
│   │   ├── config.ts           # Constantes públicas + estructura de descargas
│   │   └── cn.ts
│   ├── pages/
│   │   ├── auth/            # Login, Register, ForgotPassword, ResetPassword
│   │   ├── dashboard/       # DashboardIndex, MyAccount, Downloads, MyLicense, MyDevices
│   │   ├── admin/           # AdminIndex (panel de administración)
│   │   ├── public/Home.tsx
│   │   └── NotFound.tsx
│   ├── types/               # Tipos de la BD y del dominio
│   └── styles/index.css
├── supabase/
│   ├── migrations/          # Migraciones de BD (perfiles, licencias, dispositivos,
│   │                        #  activaciones, admin, versiones de la app)
│   └── functions/           # Edge Functions de licenciamiento (helpers en _shared)
```

---

## Base de datos (Supabase)

Las migraciones viven en `supabase/migrations/`. Todo el acceso a datos de
licencias pasa por Edge Functions; las escrituras son siempre server-side y las
lecturas del cliente están restringidas por RLS.

| Migración | Contenido |
|---|---|
| `0001_create_profiles` | Tabla `profiles` (extiende `auth.users`) |
| `0002_create_licenses` | Tabla `licenses` (solo guarda el hash SHA-256 de la clave) |
| `0003_create_devices` | Tabla `devices` (solo guarda el hash SHA-256 del fingerprint) |
| `0004_create_license_activations` | Tabla `license_activations` (slots de activación) |
| `0005_create_admin_users` | Tabla `admin_users` (fuente de verdad del rol admin) |
| `0006_create_app_versions` | Tabla `app_versions` (publicación de versiones del Desktop) |
| `0007_admin_gate` | RPC `is_admin()`/`authorize()` y policies de lectura admin |

---

## Instalación

**Requisitos:** Node.js 22+ y npm.

```bash
# 1. Clonar el repositorio
git clone https://github.com/keinergarcia/Aromia_web.git
cd Aromia_web

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con los valores de tu proyecto Supabase

# 4. Ejecutar en desarrollo
npm run dev
```

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Compila para producción (`tsc -b && vite build`) |
| `npm run lint` | ESLint |
| `npm run preview` | Previsualiza el build de producción |

---

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **Project Settings → API**, copia la **URL** y la **anon key**.
3. Configura `.env`:
   ```
   VITE_SUPABASE_URL=<tu project url>
   VITE_SUPABASE_ANON_KEY=<tu anon key>
   ```
4. Aplica las migraciones desde `supabase/migrations/` en el SQL Editor de Supabase o con `supabase db push`.
5. En **Authentication → URL Configuration**, configura la **Site URL** y las **Redirect URLs**.

> **Nunca** coloques la `service_role key` en el frontend.

---

## Despliegue en GitHub Pages

El flujo **Deploy to GitHub Pages** publica automáticamente la rama `main` en
`https://keinergarcia.github.io/Aromia_web/`.

Requisitos (solo la primera vez):

1. En **Settings → Secrets and variables → Actions** del repo crea dos secrets
   (van a las variables de entorno del build):
   - `VITE_SUPABASE_URL` — URL de tu proyecto Supabase.
   - `VITE_SUPABASE_ANON_KEY` — la anon/publishable key.
2. En **Settings → Pages** selecciona **Source: GitHub Actions**.
3. En Supabase (**Authentication → URL Configuration**):
   - **Site URL**: `https://keinergarcia.github.io/Aromia_web`
   - **Redirect URLs**: `https://keinergarcia.github.io/Aromia_web/**`

Con cada `push` a `main` (o desde **Actions → Deploy to GitHub Pages → Run
workflow**) el build se genera en CI y se publica. El frontend resuelve sus
rutas con `import.meta.env.BASE_URL`, y `public/404.html` evita el 404 al
refrescar subrutas (`/dashboard`, `/admin`, …). La base de datos y las Edge
Functions permanecen en Supabase.

---

## Variables de entorno

### Públicas (frontend)

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon/publishable (pública por diseño, protegida por RLS) |

### Secretas (solo Edge Functions)

- `SUPABASE_SERVICE_ROLE_KEY` — Inyectada automáticamente por Supabase.
- `AROMIA_SIGNING_PRIVATE_KEY`, `AROMIA_SIGNING_PUBLIC_KEY`, `AROMIA_KEY_ID` — Par Ed25519 de firma de licencias. Se configuran con `supabase secrets set`.

---

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Landing principal |
| `/login` | Solo sin sesión | Inicio de sesión |
| `/registro` | Solo sin sesión | Registro |
| `/recuperar` | Solo sin sesión | Recuperación de contraseña |
| `/restablecer` | Sesión de recuperación | Establecer nueva contraseña |
| `/dashboard` | Privado | Panel principal |
| `/dashboard/mi-cuenta` | Privado | Perfil y datos de cuenta |
| `/dashboard/descargas` | Privado | Sección de descargas |
| `/dashboard/mi-licencia` | Privado | Licencia del usuario |
| `/dashboard/mis-dispositivos` | Privado | Dispositivos vinculados |
| `/admin` | Privado + rol admin | Panel de administración de licencias |

---

## Seguridad

- Frontend usa **solo** la anon key. Ningún secreto en el cliente.
- **RLS** activada en todas las tablas: cada usuario solo accede a sus datos.
- Rutas protegidas con `ProtectedRoute` y `AdminRoute`.
- Firma **Ed25519**: la private key vive exclusivamente en las secrets de Supabase.
- Logout elimina la sesión local; no se puede volver al panel con el botón Atrás.

---

## Edge Functions

| Función | Descripción |
|---|---|
| `create-license` | Crea una nueva licencia |
| `activate-license` | Activa la licencia en un dispositivo |
| `validate-license` | Validez de una licencia |
| `deactivate-device` | Desactiva un dispositivo |
| `get-latest-version` | Entrega la última versión y la public key |
| `admin-list-licenses` | Lista todas las licencias (admin) |
| `admin-users-search` | Busca clientes (admin) |
| `admin-license-update` | Actualiza licencias (admin) |
| `admin-deactivate-device` | Desactiva dispositivos desde admin |
| `admin-reactivate-device` | Reactiva un dispositivo desactivado (admin) |
| `client-my-license` | Licencia del usuario autenticado |
| `client-my-devices` | Dispositivos del usuario autenticado |

---

<p align="center">
  Desarrollado por <strong>ElChivalez</strong><br/>
  <sub>Septiembre 2026</sub>
</p>
