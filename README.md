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
- **Panel de administración** para gestionar licencias, buscar clientes y administrar dispositivos.
- **Sistema de licenciamiento** con Edge Functions de Supabase, firma Ed25519 y validación de licencias.

---

## Estado

| Fase | Estado |
|------|--------|
| Fase 1 — Base web (landing, auth, panel usuario) | Implementada |
| Fase 2 — Sistema de licenciamiento (Edge Functions, panel admin, firma Ed25519) | Implementada |
| Integración con AROMIA Desktop | Pendiente |

---

## Estructura del proyecto

```
├── public/                  # Estáticos (favicon, logo)
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
│   ├── migrations/          # Migraciones de BD (profiles, licenses, devices, admin)
│   └── functions/           # Edge Functions de licenciamiento
└── docs/                    # Documentación, investigación y planificación
```

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
| `client-my-license` | Licencia del usuario autenticado |
| `client-my-devices` | Dispositivos del usuario autenticado |

---

<p align="center">
  Desarrollado por <strong>ElChivalez</strong><br/>
  <sub>Septiembre 2025</sub>
</p>
