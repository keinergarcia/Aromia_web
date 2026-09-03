# AROMIA_WEB — Plan de Implementación Fase 1

**Versión:** 4.0 (Plan de Fase 1 — pendiente de aprobación)
**Fecha:** 31/08/2026
**Estado:** Plan detallado. **No se ha escrito código todavía.**

> Principio rector del proyecto: **NO agregar funcionalidades ni estructuras solo porque "podrían ser útiles".** Todo debe tener una razón técnica y pertenecer al alcance aprobado.
>
> Fuera del alcance de Fase 1 (se hará en fases controladas posteriores): licenciamiento completo, activación, límite de dispositivos, revocación/renovación/vencimiento, panel administrativo, generación de licencias firmadas, e integración con AROMIA Desktop. **AROMIA Desktop 1.0.0 permanece intacto.**

---

## 1. Arquitectura propuesta (Fase 1)

```
 GITHUB (Aromia_web)
      │
      ▼
 VERCEL (React + Vite + TypeScript + Tailwind)
   ├── /              → página pública (landing + descarga)
   └── /dashboard     → panel privado básico (protegido por auth)
      │  HTTPS
      ▼
 SUPABASE
   ├── Auth            → registro, login, logout, reset password
   ├── PostgreSQL      → tabla `profiles` (mínima, con RLS)
   └── RLS             → policies sobre `profiles`
```

**Nota sobre hosting:** se deja la arquitectura lista para Vercel, pero la Fase 1 es código local/commit; el despliegue real se decide en una fase posterior.

**Relación con AROMIA Desktop:** en Fase 1 no existe ninguna conexión. El Desktop sigue funcionando 100% local. La conexión (activación/validación/versiones) es exclusivamente de una fase futura.

---

## 2. Estructura de carpetas propuesta

```
Aromia_web/
│
├── .github/workflows/         # CI básica: install + lint + typecheck + build
├── docs/                      # análisis, investigación, plan (este archivo)
│
├── src/
│   ├── main.tsx               # entrada React
│   ├── App.tsx                # router + providers
│   ├── components/
│   │   ├── ui/                # tokens reutilizables: Button, Card, Input, Spinner, Badge
│   │   └── public/            # Hero, Features, Screenshots, Faq, DownloadCta, ...
│   ├── layouts/               # Layout público y Layout protegido (dashboard)
│   ├── pages/
│   │   ├── public/            # Home, Download, Contact, ...
│   │   └── auth/              # Login, Register, ForgotPassword, ResetPassword
│   │   └── dashboard/         # Dashboard, Licencia (estructura), Dispositivos (estructura),
│   │                          #   Descargas, MiCuenta
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # cliente público (anon/publishable key) — SOLO aquí
│   │   │   └── server.ts      # (reservado) cliente con secret key — NUNCA en frontend
│   │   ├── config.ts          # constantes públicas (nombre, versión caducada, links)
│   │   └── format.ts
│   ├── hooks/                 # useAuth, useRequireAuth (guard)
│   ├── types/                 # Profile, etc.
│   ├── lib/router.tsx         # rutas protegidas/privadas
│   └── styles/index.css       # Tailwind + tokens
│
├── supabase/
│   ├── migrations/            # SQL versionado (Fase 1: solo profiles)
│   └── config.toml            # config local de Supabase
│
├── .gitignore
├── .env.example               # SOLO VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

**Regla de claves:** `src/lib/supabase/server.ts` **no se crea** en Fase 1 (no hace falta ninguna operación con secret key). El cliente público (`client.ts`) usa la **anon/publishable key**, que es pública por diseño y segura porque RLS protege los datos.

---

## 3. Dependencias que realmente necesitamos (y por qué)

### Dependencias de producción (mínimas)
| Paquete | Por qué es necesaria |
|---|---|
| `react`, `react-dom` | Base del frontend (requisito). |
| `react-router-dom` | Navegación entre rutas públicas/privadas y guard de rutas. |
| `@supabase/supabase-js` | Cliente oficial de Supabase (Auth + DB) desde el frontend. No hay alternativa segura para conectar a Supabase desde el navegador. |
| `lucide-react` | Iconografía profesional y consistente; tree-shakeable, sin coste de bundle relevante. |

### Dependencias de desarrollo
| Paquete | Por qué |
|---|---|
| `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom` | Build + TS (requisitos aprobados). |
| `tailwindcss`, `postcss`, `autoprefixer` | Tailwind CSS (requisito aprobado). |
| `eslint`, `typescript-eslint` | Lint básico para calidad desde el inicio. |

**No se incluyen aún:** ninguna librería de formularios, estado global (Redux/Zustand), testing, ni bibliotecas de licencias. Se agregan solo cuando el alcance lo justifique (fases posteriores).

---

## 4. Tablas de Supabase que proponemos en Fase 1

Se crea **UNA sola tabla**: `profiles`.

### `profiles` — justificación
Sirve como **ancla de identidad** del usuario autenticado:
1. Es el patrón estándar y recomendado por Supabase para extender `auth.users` (que no debe modificarse) con campos de cuenta no sensibles.
2. Permite exponer al usuario su perfil/estado de cuenta de forma **protegida por RLS** (el patrón se ejercita ya desde Fase 1, como pidió la seguridad).
3. Es el **punto de pivote natural** para la arquitectura futura `Usuario → Cuenta → Licencia → Dispositivo`: las futuras tablas de licencias referenciarán a `profiles.id` como `customer_id`. Por eso se incluye ahora (razón técnica de preparación), pero **sin** campos de licencias.

```
profiles
├── id          uuid PK REFERENCES auth.users(id) ON DELETE CASCADE
├── email       text NOT NULL
├── full_name   text
├── account_status text DEFAULT 'active'   -- estado de cuenta (activa)
├── created_at  timestamptz DEFAULT now()
└── updated_at  timestamptz DEFAULT now()
```

**NO se crean** `customers`, `licenses`, `license_activations`, `devices`, `admin_users`, `app_versions`: pertenecen al sistema de licencias (Fase 2+) y crearías molería anticipo sin uso. Se documenta su diseño futuro en §6, pero no se materializan aún.

**RLS en `profiles`:**
```
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- select: cada usuario solo ve su propio perfil
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- insert: el usuario crea su perfil al registrarse (solo propio id)
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- update: el usuario edita su propio perfil
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```
- `anon`: **sin grants** sobre `profiles` (nada público de perfiles).
- La creación del perfil se hace en una **función SQL/trigger** al crear el usuario de Auth (patrón recomendado por Supabase), o desde el frontend tras el registro. Se elige la función/trigger para que el perfil exista siempre.

---

## 5. Variables de entorno y separación de claves

### Públicas (van en `VITE_` y sí se pueden compilar al frontend)
```
VITE_SUPABASE_URL=<project url>
VITE_SUPABASE_ANON_KEY=<anon o publishable key>
```
- La anon/publishable key es **pública por diseño** y es segura **porque RLS protege los datos**. Es lo único que el frontend necesita.

### Secretas (NUNCA en frontend, no existen en Fase 1)
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEYS` → **reservadas** para Edge Functions de fases futuras.
- Clave privada de firma de licencias → solo servidor (fase futura).

### `.env.example`
Contiene únicamente las variables públicas con nombres de ejemplo. **Nunca** se commitean valores reales. `.gitignore` excluye `.env*` (excepto `.env.example`).

### Regla de acceso directo
El frontend **solo** usa el cliente público (anon) + RLS. No hay acceso directo privilegiado desde el navegador.

---

## 6. Flujo de autenticación (Fase 1)

Supabase Auth gestiona el ciclo completo (no lo reinventamos):

```
REGISTRO      → onAuthStateChange → crear profile (trigger) → redirigir a /dashboard
INICIO SESIÓN → login email/password → sesión → /dashboard
CIERRE        → signOut() → redirigir a /
RECUPERACIÓN  → resetPasswordForEmail(token) → link con token → nueva contraseña
RESET         → updatePassword(nueva contraseña)
PROTECCIÓN    → hook useRequireAuth: si no hay sesión → redirigir a /login
```

- **Reenvío de email de confirmación/recuperación:** se configura el `site_url` y las URLs de redirección en Supabase (regilia local/vercel).
- **Rutas privadas:** `/dashboard/*` requieren sesión; las páginas de auth redirigen a `/dashboard` si ya hay sesión.

---

## 7. Panel privado básico (Fase 1)

Tras iniciar sesión, un **dashboard sencillo** que muestra:
- Usuario autenticado (email / full_name desde `profiles`).
- Estado de cuenta (`account_status: active`).
- Menú lateral **preparado** (estructura inicial sin funcionalidad real):
  - Mi licencia (placeholder)
  - Mis dispositivos (placeholder)
  - Descargas
  - Mi cuenta

Solo `Mi cuenta` y `Descargas` pueden mostrar contenido básico determinado; `Mi licencia` y `Mis dispositivos` quedan como placeholders claramente "próximamente", sin inventar funcionalidad.

---

## 8. Sección de descarga (preparada, no pública aún)

- Página/sección "Descargar AROMIA para Windows" con estructura tipada para **posteriormente** mostrar: versión, fecha de publicación, arquitectura, tamaño, notas de cambios y enlace.
- En Fase 1 **no** se publica un enlace definitivo al instalador ni se implementa protección de descarga. El bloque se alimenta de un **objeto de configuración tipado** (`src/lib/config.ts` → `appVersion`) que ya tiene los campos, rellenados con datos neutros/placeholder y sin URL real (o URL vacía / "próximamente").
- Esto permite cambiar a "descarga autenticada" en el futuro sin rediseño.

---

## 9. Arquitectura preparada para licencias (futuro)

Se deja la forma del modelo (no las tablas) documentada para la siguiente fase:

```
Usuario (auth.users)
   └── Cuenta (profiles / future customers)
          └── Licencia (licenses)
                 └── Dispositivo autorizado (devices) + activaciones
                        └── AROMIA Desktop (valida contra Edge Functions)
```

**En Fase 1** solo existe `profiles` como raíz. Las demás entidades y Edge Functions se construyen en la fase de licencias, siguiendo el diseño aprobado del informe (`Ed25519`, firma servidor, high-water mark offline, límite de dispositivos, etc.). La integración con AROMIA Desktop se hará mediante `ILicenseService`/`LicenseService` (contrato en `Aromia.Core`, implementación en `Aromia.Infrastructure`, DI en `App.xaml.cs`) **cuando se apruebe esa fase**, sin tocar hoy el Desktop.

---

## 10. Página pública — secciones

1. Navbar: logo AROMIA, links de sección, botón **Descargar AROMIA** y botón **Iniciar sesión**.
2. Hero: logo + nombre + descripción "Sistema de gestión para productos aromáticos" + CTAs (Conocer / Descargar).
3. Características (Productos, Inventario, Producción, Ventas, Estadísticas, Reportes, Copias de seguridad, Historial, Tema claro/oscuro, Funcionamiento local).
4. Beneficios.
5. Capturas / sección visual preparada (sin capturas falsas; puede ser mockup/placeholder coherente).
6. "¿Qué incluye AROMIA?".
7. FAQ (¿Qué es AROMIA? ¿En qué sistema funciona? ¿Necesita Internet? ¿Dónde se guardan los datos? ¿Backups? ¿Cómo se instala?).
8. Contacto / soporte.
9. Footer.

Todo con contenido **real y neutral**: no se inventan testimonios, clientes, premios ni estadísticas. Capturas reales del Desktop se añaden cuando sean proporcionadas.

---

## 11. Riesgos de seguridad (Fase 1)

| Riesgo | Mitigación en Fase 1 |
|---|---|
| Anon key expuesta | Es pública por diseño; la seguridad real es **RLS**. No hay datos sensibles alcanzables. |
| Secret key en frontend | Imposible: no se crea `server.ts` ni se referencian secretos; solo anon key. |
| Tablas sin RLS | Solo existe `profiles` y tiene RLS activa + grants mínimos. |
| Perfil cruzado entre usuarios | Policies `auth.uid() = id` impiden leer/editar perfiles ajenos. |
| Fuga de `.env` | `.gitignore` excluye `.env*`; solo `VITE_` públicas en example. |
| XSS/escapado | React escapa por defecto; no se usa `dangerouslySetInnerHTML`. |
| Error leakage | No se exponen excepciones internas; feedback genérico al usuario. |

---

## 12. Qué queda FUERA de la Fase 1

- Sistema de licencias (crear/suspender/revocar/renovar, activación, límite de dispositivos).
- Edge Functions de licencias y firma criptográfica.
- Panel administrativo y rol `admin`.
- Tablas `customers`, `licenses`, `devices`, `admin_users`, `app_versions`.
- Cliente de licencias e identificador de dispositivo en AROMIA Desktop.
- Descarga pública definitiva y protección de descarga autenticada.
- Pagos, actualización automática, sincronización de datos.

**AROMIA Desktop 1.0.0 queda intacto y sin modificaciones.**

---

*Plan de Fase 1 listo. A la espera de tu aprobación para comenzar la implementación.*
