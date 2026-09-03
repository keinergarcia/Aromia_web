# AROMIA Web

Portal oficial y sistema de licencias de **AROMIA Desktop** (sistema de gestión de productos aromáticos).

**Estado:** Fase 1 (base web) + Fase 2 (sistema de licenciamiento) implementadas. Incluye Edge Functions de licenciamiento (crear/activar/validar/desactivar), panel admin (`/admin`) y firma Ed25519. La integración con AROMIA Desktop (cliente que consume las Edge Functions) se realiza en el proyecto del Desktop.

---

## Tecnologías

- [React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Supabase](https://supabase.com/) (Auth + PostgreSQL + RLS)
- [@supabase/supabase-js](https://supabase.com/docs/reference/javascript)
- [Lucide](https://lucide.dev/) (iconografía)

## Estructura del proyecto

```
├── public/                  # estáticos (favicon)
├── src/
│   ├── components/
│   │   ├── auth/            # ProtectedRoute, GuestRoute, AuthCard, AdminRoute
│   │   ├── dashboard/       # PageHeader, ComingSoonSection
│   │   ├── public/          # Hero, Features, Benefits, Screenshots, FAQ, Contact…
│   │   └── ui/              # sistema de diseño (Button, Input, Card, Badge, Alert, Logo…)
│   ├── contexts/AuthContext.tsx
│   ├── layouts/             # PublicLayout, AuthLayout, DashboardLayout, AdminLayout
│   ├── lib/
│   │   ├── supabase/client.ts  # cliente público (SOLO anon key)
│   │   ├── admin.ts            # capa de acceso a las Edge Functions admin
│   │   ├── config.ts           # constantes públicas + estructura de descargas
│   │   └── cn.ts
│   ├── pages/
│   │   ├── auth/            # Login, Register, ForgotPassword, ResetPassword
│   │   ├── dashboard/       # DashboardIndex, MyAccount, Downloads, MyLicense, MyDevices
│   │   ├── admin/           # AdminIndex (panel de licenciamiento)
│   │   ├── public/Home.tsx
│   │   └── NotFound.tsx
│   ├── types/               # tipos de la BD y del dominio
│   └── styles/index.css
├── supabase/
│   ├── migrations/          # Fase 1 (profiles) + Fase 2 (licensing + admin)
│   └── functions/           # Edge Functions de licenciamiento
└── docs/                    # análisis, investigación, plan
```

## Instalación y ejecución

Requisitos: **Node.js 22+** y **npm**.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
#    Copia .env.example como .env y rellena los valores de tu proyecto Supabase.
cp .env.example .env

# 3. Ejecutar en desarrollo
npm run dev
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Compila producción (`tsc -b && vite build`) |
| `npm run lint` | ESLint |
| `npm run preview` | Previsualiza el build de producción |

> No existe un script `typecheck` independiente: la comprobación de tipos se
> ejecuta como parte de `npm run build` (vía `tsc -b`).

## Configuración de Supabase

1. Crea un proyecto en https://supabase.com.
2. En **Project Settings → API**, copia la **URL** y la **anon/publishable key**.
3. Rellena `.env`:
   ```
   VITE_SUPABASE_URL=<tu project url>
   VITE_SUPABASE_ANON_KEY=<tu anon/publishable key>
   ```

> **Nunca** coloques la `service_role` / `secret key` en el frontend. Se reservan
> exclusivamente para operaciones de servidor (Edge Functions).

### Aplicar la migración

La migración `supabase/migrations/0001_create_profiles.sql` crea la tabla
`profiles` con sus políticas RLS y el trigger que crea el perfil al registrarse.

Puedes ejecutarla en el **SQL Editor** del dashboard de Supabase pegando el contenido
del archivo, o con la CLI:

```bash
# (opcional) con la CLI de Supabase
supabase db push
```

### Configuración de autenticación

En **Authentication → URL Configuration**:

- **Site URL:** la URL de tu aplicación (p. ej. `http://localhost:5173` en desarrollo).
- **Redirect URLs:** añade tu URL para los flujos de confirmación y recuperación.

Según la configuración de tu proyecto, el registro puede requerir confirmación de
correo (recomendado). La app ya maneja ambos casos:

- Con confirmación activada: tras el registro se muestra *"Revisa tu correo"*.
- Sin confirmación: la sesión se inicia directamente y se redirige al panel.

## Variables de entorno

### Públicas (en el frontend, `VITE_`)
| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon/publishable (pública por diseño) |

La anon key es segura en el navegador **porque la base de datos está protegida con RLS**.

### Secretas (NUNCA en el frontend)
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEYS` — reservadas para Edge Functions (inyectadas automáticamente).
- `AROMIA_SIGNING_PRIVATE_KEY`, `AROMIA_SIGNING_PUBLIC_KEY`, `AROMIA_KEY_ID` — par Ed25519 de firma de licencias (solo servidor). Se configuran con `supabase secrets set`.

## Tablas y RLS (Fase 1)

**Única tabla adicional:** `public.profiles`, relacionada con `auth.users`.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK → `auth.users(id)` | Identidad del usuario |
| `email` | text | Correo del usuario |
| `full_name` | text | Nombre mostrado |
| `account_status` | text (default `active`) | Estado de la cuenta |
| `created_at` / `updated_at` | timestamptz | Marcas de tiempo |

**Políticas RLS** (cada usuario solo gestiona su propio perfil):

- `select_own_profile`: `USING (auth.uid() = id)`
- `insert_own_profile`: `WITH CHECK (auth.uid() = id)`
- `update_own_profile`: `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`

Sin permisos para `anon`. El perfil se crea automáticamente mediante un trigger
al insertarse el usuario en `auth.users` (copia el `full_name` de los metadatos).

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Landing principal |
| `/login` | Solo sin sesión | Inicio de sesión |
| `/registro` | Solo sin sesión | Registro |
| `/recuperar` | Solo sin sesión | Recuperación de contraseña |
| `/restablecer` | Sesión de recuperación | Establecer nueva contraseña |
| `/dashboard` | Privado | Panel principal (usuario + estado de cuenta) |
| `/dashboard/mi-cuenta` | Privado | Perfil y datos de cuenta |
| `/dashboard/descargas` | Privado | Sección de descargas preparada |
| `/dashboard/mi-licencia` | Privado | Placeholder (integración con Desktop pendiente) |
| `/dashboard/mis-dispositivos` | Privado | Placeholder (integración con Desktop pendiente) |
| `/admin` | Privado + rol admin | Panel de administración de licencias |

## Seguridad

- El frontend usa **solo** la anon/publishable key. Ningún secreto en el cliente.
- **RLS** activada en `profiles`: imposible cruzar perfiles entre usuarios.
- Rutas privadas protegidas por `ProtectedRoute` (redirige a `/login`).
- Logout elimina la sesión local; no se puede volver al panel con el botón Atrás.
- La sección de descargas no expone ningún instalador ni enlace falso todavía.

## Alcance del sistema

**Fase 1 (implementada):** landing pública, registro, inicio de sesión, recuperación y
restablecimiento de contraseña, cierre de sesión, panel privado con perfil y estado de
cuenta, sección de descargas preparada, Supabase Auth + `profiles` + RLS.

**Fase 2 — Licenciamiento (implementada):**
- Tablas y RLS: `licenses`, `devices`, `license_activations`, `admin_users`, `app_versions`.
- Edge Functions (Deno): `create-license`, `activate-license`, `validate-license`,
  `deactivate-device`, `get-latest-version` + panel admin (`admin-list-licenses`,
  `admin-users-search`, `admin-license-update`, `admin-deactivate-device`) + panel
  cliente (`client-my-license`, `client-my-devices`).
- Firma **Ed25519**: la private key vive solo en las secrets de la Edge Function;
  `get-latest-version` entrega la public key al Desktop.
- Secretos: `AROMIA_SIGNING_PRIVATE_KEY`, `AROMIA_SIGNING_PUBLIC_KEY`, `AROMIA_KEY_ID`.
- Panel admin `/admin` (protegido por rol): crear/listar/suspender/revocar/renovar
  licencias, buscar clientes, ver y desactivar dispositivos.
- Panel cliente `/dashboard/mi-licencia` y `/mis-dispositivos`: cada usuario autenticado
  ve SOLO sus licencias y dispositivos (servidos vía Edge Functions, sin exponer el
  `license_key`), y puede desactivar sus propios equipos.

**Pendiente (proyecto AROMIA Desktop):** consumir `activate-license`/`validate-license`,
cálculo de fingerprint, verificación offline de la firma con la public key y la pantalla
de activación.
