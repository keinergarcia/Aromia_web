# AROMIA_WEB — Diseño Técnico Definitivo: FASE 2 (Sistema de Licenciamiento)

**Versión:** 2.0 (Diseño aprobado — Paso 1 de Fase 2)
**Fecha:** 01/09/2026
**Estado:** Diseño **APROBADO** por el cliente el 01/09/2026 (todas las decisiones pendientes √ D1-D9 resueltas). Se inicia la implementación por etapas E1→E7.

> Este documento es la propuesta de arquitectura **definitiva** de Fase 2. Es posterior y
> hereda el análisis de `AROMIA_WEB_investigacion_licencias.md` (Fase 0). La Fase 1 está
> aprobada y queda intacta. Nada aquí se implementa hasta tu aprobación (ver sección final).

---

## 1. MODELO DE LICENCIAMIENTO

### 1.1 Entidades conceptuales

| Entidad | Rol | ¿Persistida? |
|---|---|---|
| **Cliente / Cuenta** | El usuario autenticado que compró un producto. Es la raíz de la jerarquía. Ya existe como `profiles` (Fase 1). | `profiles` (existente) |
| **Producto** | El software licenciado (`AROMIA`). Conjunto fijo de catálogo, no entidad dinámica. | Constante/`product` en BD |
| **Plan** | Tipo de licencia (p. ej. `perpetual`, `annual`). Identificador, sin pricing en esta fase. | `licenses.plan` |
| **Licencia** | Derecho de uso. Pertenece a un cliente, define plan, estado, vencimiento y `max_activations`. Referencia al producto. | `licenses` |
| **Activación** | Registro de que una licencia fue activada en un dispositivo concreto (trazabilidad + conteo server-side). | `license_activations` |
| **Dispositivo** | Un equipo Windows identificado por un fingerprint estable. Reutilizable entre licencias del mismo cliente. | `devices` |
| **Usuario admin** | Quien gestiona licencias. `auth.users` (existente) + marcado como admin. | `admin_users` |

### 1.2 Ciclo de vida del licenciamiento

```
Cliente compra/recibe un plan
        │
        ▼
Admin crea licencia ─────────────────────────────► licenses (status: active)
        │                                             │ license_key (hash) generado
        │                                             │ OJO: AÚN NO se firma licencia local
        │                                             │     (falta el deviceFingerprint)
        ▼
Desktop activa con LicenseKey + fingerprint ─────► license_activations (status: active)
        │                                              │ activation_count++
        ▼                                              ▼
Servidor firma licencia local (YA con fingerprint) ─► Desktop la guarda (offline OK)
        │
        ▼
Validación periódica online (silenciosa)
        ├── OK  ──► se refresca la ventana de gracia
        ├── 401/403/404 (revocada/expiró/no existe) ──► status: revoked/expired ──► se desactiva
        └── 5xx/timeout ──► no se desactiva (falla abierta dentro de gracia)
```

> **Punto clave:** la licencia local firmada (§5) contiene `deviceFingerprint` y por tanto
> **solo puede firmarse en `activate-license`/`validate-license`**, nunca en `create-license`
> (que aún no conoce el dispositivo). `create-license` solo crea la entidad + `license_key`.
> El documento §4.1 queda corregido en consecuencia.

### 1.3 Estados de licencia y reglas

| Estado | Significado | ¿Puede activar/validar online? | ¿Válida para Offline? | Reglas |
|---|---|---|---|---|
| `pending` | Creada pero aún no activada / no pagada | **No** | No | No puede activar ni validar. Solo admin la promueve a `active` o la cancela. Transición: `pending → active` o `pending → revoked` |
| `active` | Vigente y usable | **Sí** | Sí (dentro de gracia) | Puede activar dispositivos (respetando `max_activations`), validar y usarse offline. Transiciones: `active → suspended`, `active → expired` (por fecha), `active → revoked` |
| `suspended` | Suspendida temporalmente por el admin | **No** | No | Se rechazan nuevas activaciones y validaciones online (403). Offline: **pierde** validez en cuanto se evalúa (aunque quede gracia). Transiciones: `suspended → active` (reactivar) o `suspended → revoked` |
| `expired` | Venció `expires_at` | **No** | No (salvo transición dentro de gracia) | No puede activar/validar. Offline: el high-water mark la rechaza al superar `expires_at`+gracia. Transición: `expired → active` (renovación con nuevo `expires_at`) |
| `revoked` | Revocada por el admin (fraude, reembolso, migración) | **No** | No | Irreversible desde el cliente. No puede activar/validar/usarse. Solo el admin puede reconstruir/crear una nueva si procede |

**Reglas transversales:**
- Solo `active` permite `activate-license` y `validate-license` con éxito; `pending/suspended/expired/revoked` devuelven error (403/404) y desactivan el Desktop si ya estaba activo.
- Un cambio de estado del admin (suspender/revocar/renovar) **solo se aplica efectivamente** en el Desktop cuando este vuelve a validar online; ver §6.4 (revocación offline).
- `expired` puede reconvertirse a `active` por **renovación** (nuevo `expires_at`), lo que el Desktop refleja en la siguiente validación.

### 1.4 Conceptos clave

- **Máximo de activaciones** (`max_activations`): número de equipos que pueden tener la licencia activa a la vez. Se cumple **por conteo server-side** de activaciones activas, nunca por confiar en el cliente.
- **Emisión / Expiración** (`issued_at`, `expires_at`): marcas del servidor. `expires_at = null` para licencias perpetuas. Ambos viajan **firmados** en la licencia local.
- **Versión mínima/máxima compatible** (`min_app_version`, `max_app_version`): rango de versiones de Desktop que la licencia autoriza. El Desktop **no valida** la versión criptográficamente (lo hace la Edge Function al validar/activar); la versión autorizada se refleja en la licencia firmada y el Desktop la comprueba como política (después de verificar firma).
- **Revocación**: el admin cambia `status` a `revoked`; la siguiente validación online devuelve 403 y el Desktop se desactiva.
- **Renovación**: el admin actualiza `expires_at` / plan / `status`; el Desktop refresca su licencia local en la siguiente `validate-license` (re-firma). El efecto solo se materializa cuando el equipo vuelve a validar online; si está offline dentro de gracia, sigue con la licencia antigua hasta re-validar.
- **Desactivación de dispositivos**: el admin marca una activación como `inactive` (libera un slot). El cliente puede "desactivar" su propio dispositivo (opcional) para liberar slot sin intervención del admin; ambos caminos decrementan el conteo activo.
- **Ciclo completo (véase también §1.2 y §6):** `Admin crea firma licencia → entrega LicenseKey → Cliente lo instala en Desktop → Desktop activa (license_key + fingerprint) → servidor valida, registra dispositivo y activación, y firma la licencia local atada a ese fingerprint → Desktop verifica y guarda → validaciones periódicas online → admin renueva / suspende / revoca / desactiva dispositivos`.

---

## 2. SEGURIDAD

### 2.1 Jerarquía de claves (violación del diseño = fallo)

```
[Servidor — Edge Function]  ──►  PRIVATE KEY Ed25519  (solo aquí, env var cifrada)
        │ firma
        ▼
[Licencia local firmada]  ──►  contiene signature (ed25519)
        │ verifica
        ▼
[AROMIA Desktop]  ──►  PUBLIC KEY Ed25519 embebida en el binario
```

### 2.2 Reglas de seguridad (no negociables)

1. **Private key Ed25519**: SOLO en el entorno de la Edge Function de Supabase (secreto/secret key). NUNCA en repo, frontend, `.env` web ni en Desktop.
2. **Public key Ed25519**: embebida en AROMIA Desktop (constante). Es pública por diseño: solo verifica, no puede falsificar.
3. **Frontend web (React/Vite)**: únicamente anon/publishable key (`sb_publishable_*`). Ningún secreto.
4. **`.env` web** contiene solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. La `service_role` / secret key **no** se coloca jamás en el frontend.
5. **Cliente Desktop**: solo verifica firmas con la public key. Nunca tiene private key, ni credenciales admin, ni secret key de Supabase.
6. **Algoritmo**: Ed25519. En el servidor (Deno) es nativo. En Desktop (Windows/.NET) se usa **NSec.Cryptography (libsodium)** porque `System.Security.Cryptography.Ed25519` no es soportado en Windows (`[UnsupportedOSPlatform("windows")]`).
7. **Verificación de firma SIEMPRE antes de leer campos** (patrón SIOS: autenticidad antes que política).

### 2.3 Almacenamiento de secretos

| Secreto | Ubicación | Quién lo usa |
|---|---|---|
| Private key Ed25519 (firma) | Secret/Secrets de Edge Function | `activate-license`, `validate-license` (NO `create-license`) |
| Secret key de Supabase (nuevo sistema, `sb_secret_*`) | Secret de Edge Function | SDK `@supabase/server` (`ctx.supabaseAdmin`) |
| Public key Ed25519 (verificación) | Embestida en Desktop + opcionalmente entregada por `get-latest-version` | Desktop |
| Master key / rotación de `key_id` | Secret (permite cambiar la private key sin invalidar licencias existentes) | Edge Functions |

---

## 3. SUPABASE — TABLAS

**No se crean todavía.** Propuesta de esquema definitivo.

### 3.1 Relación general

```
profiles (id = auth.users.id)          -- Fase 1 (intacta)
   │
   ├── licenses (customer_id → profiles.id)
   │        └── license_activations (license_id → licenses.id)
   │                 └── devices (device_id → devices.id)
   │
   └── admin_users (id → auth.users.id)   -- rol administrador
```

### 3.2 `licenses`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK (default gen_random_uuid()) | |
| `customer_id` | `uuid` NOT NULL FK → `profiles(id)` | Dueño de la licencia |
| `license_key` | `text` NOT NULL UNIQUE | `AROM-` + 20+ chars base32 (aleatorio criptográfico, ~128 bits), con checksum |
| `license_key_hash` | `text` NOT NULL | **SHA-256** de `license_key` (se busca por hash; la clave en claro NO se guarda en BD) |
| `product` | `text` NOT NULL DEFAULT `'AROMIA'` | |
| `plan` | `text` NOT NULL | `perpetual` / `annual` |
| `status` | `text` NOT NULL DEFAULT `'active'` | ver §1.3 |
| `max_activations` | `int` NOT NULL DEFAULT `1` | |
| `issued_at` | `timestamptz` NOT NULL DEFAULT now() | |
| `expires_at` | `timestamptz` NULL | NULL = perpetua |
| `min_app_version` | `text` NULL | versión mínima compatible |
| `max_app_version` | `text` NULL | versión máxima compatible |
| `activated_at` | `timestamptz` NULL | primera activación |
| `last_validated_at` | `timestamptz` NULL | última validación online |
| `activation_count` | `int` NOT NULL DEFAULT `0` | conteo **activo** (server-side) |
| `created_at` / `updated_at` | `timestamptz` | |

**Constraints/índices:**
- `UNIQUE (license_key_hash)` — búsqueda por hash.
- `INDEX (customer_id)` — listar licencias del cliente.
- `INDEX (status)` — filtros de admin.
- `CHECK (max_activations >= 1)`.
- `CHECK (status IN ('active','suspended','expired','revoked','pending'))`.

**RLS:**
- `authenticated` (usuario normal): **NO** puede leer en bruto la tabla vía RLS directo. **DECISIÓN APROBADA (D4):** el cliente **solo** accede a sus datos **vía Edge Functions autorizadas**; no hay RLS directo ni vista en bruto. Nunca permitir `update`/`delete` al cliente normal sobre `licenses`.
- `admin`: `select`/`update` de todas (vía `authorize('admin')` o Edge Function con secret key).
- `anon`: sin acceso.
- **Garantía frente a cross-tenant (punto 7):** en el acceso vía Edge Function, el filtro obligatorio es `customer_id = auth.uid()` para el cliente, y rol admin para el resto. Un usuario normal **nunca** puede consultar ni modificar licencias, dispositivos ni activaciones de otro usuario. Esto se aplica igual a `devices` y `license_activations` (solo exposibles vía Edge Function con el mismo filtro `customer_id = auth.uid()`).

### 3.3 `devices`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `customer_id` | `uuid` NOT NULL FK → `profiles(id)` | Dueño del dispositivo |
| `fingerprint` | `text` NOT NULL UNIQUE | hash SHA-256 estable (ver §8). **No** se guarda hardware crudo |
| `device_name` | `text` | ejemplo informativo |
| `os` | `text` | `Windows` |
| `created_at` / `updated_at` | `timestamptz` | |

**Constraints/índices:**
- `UNIQUE (customer_id, fingerprint)` — un dispositivo no duplicado por cliente.
- `INDEX (fingerprint)`.

**RLS:** sin acceso directo para `authenticated` (solo vía Edge Function); `admin` vía rol.

### 3.4 `license_activations`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `license_id` | `uuid` NOT NULL FK → `licenses(id)` | |
| `device_id` | `uuid` NOT NULL FK → `devices(id)` | |
| `status` | `text` NOT NULL DEFAULT `'active'` | `active` / `inactive` / `revoked` |
| `activated_at` | `timestamptz` NOT NULL | |
| `last_validated_at` | `timestamptz` NULL | |
| `deactivated_at` | `timestamptz` NULL | cuándo se liberó el slot |

**Constraints/índices:**
- `UNIQUE (license_id, device_id)` — una activación por licencia+dispositivo.
- `INDEX (license_id, status)`.
- `CHECK (status IN ('active','inactive','revoked'))`.

**RLS:** sin acceso directo; solo vía Edge Function por licencia del cliente.

### 3.5 `admin_users`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK FK → `auth.users(id)` | rol admin |
| `created_at` | `timestamptz` | |

Se recomienda que la pertenencia a `admin_users` se traduzca también a `app_metadata.role = 'admin'` via **Custom Access Token Hook** (o se lea en la policy). Nunca usar `user_metadata` (que el cliente puede reescribir).

**Mecanismo de rol (fijar UNO):** la versión 1.0 dejaba ambigüedad entre "Custom Access Token Hook" y "leer `admin_users` en las policies". Se fija una combinación recomendada:
- `admin_users` es la **fuente de verdad** de quién es admin.
- Un **Custom Access Token Hook** inyecta `app_metadata.role='admin'` en el JWT a partir de `admin_users`, para que las RLS policies y Edge Functions puedan autorizar de forma eficiente.
- **Desventaja conocida (a asumir):** un cambio de rol tarda hasta que el JWT expire (el JWT es una fotografía). Para revocación inmediata de un admin problemático, la Edge Function sensibles debe volver a verificar contra `admin_users` en BD (no fiarse solo del claim). **DECISIÓN APROBADA (D3):** hook para rendimiento + verificación en BD en operaciones sensibles. Se asume la latencia del claim en operaciones no críticas.

**RLS:** solo lectura/escritura por admin (y por el propio hook). La verificación real de rol se hace en Edge Functions con `authorize('admin')` + `ctx.supabaseAdmin` (que salta RLS con secret key tras verificar el rol).

### 3.6 Colocación y grants

- Todas las tablas nuevas: **RLS activada** y **revocar grants** a `anon`/`authenticated` sobre columnas/campos sensibles.
- El acceso de lectura/escritura sensible se canaliza **a través de Edge Functions** con secret key, no por RLS directo del cliente.
- Los clientes solo pueden invocar funciones autorizadas; nunca tocar las tablas directamente con su claim anon.

---

## 4. EDGE FUNCTIONS

**No se crean todavía.** Justificación y definición de cada una.

### 4.1 `create-license`
- **Necesaria**: sí. Única vía de generar una licencia y su `license_key` hash.
- **Quién la llama**: solo admin (verificado server-side con `authorize('admin')`).
- **Recibe**: `customer_id`, `plan`, `max_activations`, `expires_at`, `min/max_app_version`.
- **Devuelve**: `license_key` en claro (SOLO al momento de crearla, para entrega) + metadatos de la licencia. La BD guarda solo el hash.
- **Valida**: rol admin, datos (zod), `customer_id` existe.
- **Opera**: genera `license_key` (criptográfico), calcula hash, inserta la fila en `licenses`.
  - **NO firma** la licencia local aquí: aún no existe `deviceFingerprint`. La firma atada a un dispositivo se produce en `activate-license` (y se re-firma en `validate-license`). En este paso solo se crea el registro; la "firma del payload" se difiere a la primera activación.
- **Secretos**: secret key de Supabase. **La private key de firma no se usa aquí** (no hay payload que firmar aún).
- **Anti-abuso**: solo admin; rate limit; validación de esquema.

### 4.2 `activate-license`
- **Necesaria**: sí. Es el corazón de la activación online.
- **Quién la llama**: el Desktop que pretende activar. **No requiere sesión web del usuario**: la autorización se basa en poseer el `license_key` válido (con su checksum) y en el fingerprint que envía. **DECISIÓN APROBADA (D1):** activar solo con poseer el `license_key`; mitigado con `max_activations`, conteo server-side, rate limit, y `devices.customer_id` asociado al dueño de la licencia.
- **Recibe**: `license_key`, `device_fingerprint`, `device_name`, `os`, `app_version`.
- **Devuelve**: **licencia local firmada** (payload §5, ya con `deviceFingerprint`) + OK.
- **Valida**: formato clave + checksum; licencia existe (por hash) → `active` → no vencida → `max_activations` no superado → versión compatible; fingerprint autorizado.
- **Opera**: upsert `devices`, insertar `license_activations` (activa), incrementar `activation_count`, actualizar fechas, generar payload §5 y **firmarlo** con la private key.
- **Secretos**: private key Ed25519, secret key de Supabase.
- **Anti-abuso**: rate limit por IP y por `license_key`; validación de esquema; nunca exponer `activation_count` real en bruto; conteo server-side.

### 4.3 `validate-license`
- **Necesaria**: sí. Validación periódica silenciosa del Desktop.
- **Quién la llama**: Desktop (posee `license_id` + fingerprint + versión).
- **Recibe**: `license_id`, `device_fingerprint`, `app_version`.
- **Devuelve**: estado vigente (re-firma si hay renovación/cambio de plan) o señal de revocación/expiración.
- **Valida**: licencia activa, no vencida, versión compatible.
- **Opera**: actualiza `last_validated_at`, refresca la licencia firmada si cambió `expires_at`/plan/status, marca `license_activations.last_validated_at`.
- **Secretos**: private key, secret key.
- **Anti-abuso**: rate limit; responde distinto ante 401/403/404 (desactivar) vs 5xx/timeout (no desactivar).

### 4.4 `deactivate-device`
- **Necesaria**: sí. Permite liberar un slot (desactivación) sin clonación manual.
- **Quién la llama**: el cliente legítimo (dueño de la licencia) o un admin.
- **Recibe**: `license_id`, `device_fingerprint` (o id de activación).
- **Devuelve**: OK.
- **Valida**: pertenencia del dispositivo a esa licencia; rol si es admin.
- **Opera**: marca la activación como `inactive`, decrementa `activation_count`.
- **Secretos**: secret key.
- **Anti-abuso**: solo el dueño/admin; debe verificar que la firma/identidad coincide; rate limit.

### 4.5 `get-latest-version`
- **Necesaria**: sí. Dónde se publica `app_versions`/versión actual + public key para el Desktop.
- **Quién la llama**: cualquiera (o con auth ligera). Dato público.
- **Recibe**: nada (o `app_version` actual para diff).
- **Devuelve**: versión más reciente, `download_url` (público/condicional) y `public_key` Ed25519.
- **Valida**: nada sensible.
- **Opera**: lee la tabla pública `app_versions` (**DECISIÓN APROBADA (D6):** tabla, no constante).
- **Secretos**: ninguno (usa publishable/none).
- **Anti-abuso**: cache/rate limit; no expone secretos.

### 4.6 ¿Faltaría algo?
- `refresh-license` → lo absorbe `validate-license` (renovaciones se reflejan ahí). **No** como función separada.
- `suspend/revoke/expire` → operaciones de admin directas sobre tablas vía admin (no requieren Edge Function dedicada; se ejecutan con secret key y autorización de rol dentro de un endpoint admin o un `admin-licenses` CRUD). **Se dejan para el paso "Panel admin"**.

**Total funciones imprescindibles Fase 2 núcleo:** `create-license`, `activate-license`, `validate-license`, `deactivate-device`, `get-latest-version`.

---

## 5. FORMATO DE LICENCIA (payload firmado)

### 5.1 Versión 1 (JSON canónico, bytes exactos)

```json
{
  "v": 1,
  "licenseId": "uuid",
  "keyId": "kid-2026-01",
  "customer": "Nombre o empresa (opcional)",
  "product": "AROMIA",
  "plan": "perpetual",
  "status": "active",
  "maxActivations": 1,
  "expiresAt": "2030-01-01T00:00:00Z",
  "issuedAt": "2026-09-01T00:00:00Z",
  "graceHours": 168,
  "deviceFingerprint": "sha256-del-equipo",
  "appVersion": "1.0.0",
  "minAppVersion": null,
  "maxAppVersion": null,
  "issuedWithKey": "kid-2026-01"
}
```

Firma = **Ed25519 sobre el JSON canónico (bytes exactos del payload ordenado seriamente)**. El Desktop: (1) verifica la firma con su public key; (2) si falla → inválida (no sigue); (3) si pasa, lee los campos.

### 5.2 ¿Qué va firmado y qué no?

**Todo el payload §5.1 va firmado** (la firma Ed25519 cubre los bytes canónicos del JSON completo, que incluye todos los campos listados). Por tanto, cualquier campo del payload es a prueba de manipulación. La tabla distingue **por qué** importa cada campo firmado:

| Campo | ¿Va firmado? | ¿Por qué importa? |
|---|---|---|
| `licenseId` | ✅ (dentro del payload) | identidad de la licencia; no debe poder cambiarse |
| `keyId` / `issuedWithKey` | ✅ | permite rotación sin invalidar |
| `customer` | ✅ | informativo; evita falsificación del titular |
| `product` | ✅ | evita reutilización entre productos |
| `plan`, `status`, `maxActivations` | ✅ | política; no editable por el cliente |
| `expiresAt`, `issuedAt`, `graceHours` | ✅ | anti-tamper de tiempo y ventana |
| `deviceFingerprint` | ✅ | ata la licencia al equipo; si la editan, rompe la firma |
| `appVersion`, `min/maxAppVersion` | ✅ | política de compatibilidad firmada |

**Lo que NO va dentro del payload firmado:**
- La propia `signature` (se adjunta junto al payload, pero la firma cubre el payload y no a sí misma).
- Datos de estado local del Desktop (high-water mark, etc.) — se protegen **por separado** con su propia firma/HMAC (§6.2/§7) y **no** forman parte de la licencia firmada.
- `license_key` en claro — es un secreto de presentación, no viaja en el payload (solo su hash lo relaciona con la BD).

> Corrección a una redacción previa confusa: NO hay campos firmados vs no firmados dentro del payload; **todo el payload está firmado**.

### 5.3 `license_key` (presentación al cliente)
- `AROM-` + ~20 caracteres (base32, sin `0/O/1/I`) con ~128 bits de entropía + checksum.
- En claro **solo** se muestra en `create-license` y se usa para activar.
- En BD se guarda **solo el SHA-256** (`license_key_hash`).

---

## 6. ACTIVACIÓN DEL DESKTOP

### 6.1 Flujo online (hay Internet)

```
1. Desktop inicia, no tiene licencia válida local → muestra pantalla de activación.
2. Usuario ingresa LicenseKey (`AROM-...`).
3. Desktop calcula fingerprint del equipo (§8).
4. Desktop llama POST /activate-license con {license_key, fingerprint, device_name, os, app_version}.
5. Servidor valida (existencia por hash, status activo, no vencida, conteo < max, versión, rol/identidad).
6. Servidor hace upsert de device, inserta activación activa, incrementa activation_count,
   firma el payload §5.1.
7. Devuelve JSON firmado. Desktop verifica la firma con su public key.
8. Verificación OK → Desktop guarda `license.json` en BaseDirectory/Licenses/ (§6.2).
9. Desktop arranca en modo pleno.
```

### 6.2 Almacenamiento local (en Desktop)
- `BaseDirectory/Licenses/license.json` → licencia firmada.
- Estado de tiempo protegido (high-water mark) firmado o HMAC, guardado en archivo protegido o en la misma licencia/marcador.
- Opcional: `ProtectedData` (DPAPI, `DataProtectionScope.CurrentUser`) para el identificador de instalación / estado.
- **Nunca** private key ni secretos.

### 6.3 Verificación offline (tras activación)
- Cada arranque: verificar firma Ed25519 (public key embebida) → verificar fingerprint → verificar `expiresAt` / ventana de gracia con high-water mark → si todo OK, modo pleno; si está fuera de gracia o venció, pedir reactivación.

### 6.4 Casos de comportamiento

| Caso | Comportamiento |
|---|---|
| **Hay Internet** | activación/validación online; refresca ventana de gracia |
| **No hay Internet** | funciona en modo pleno dentro de `graceHours` (high-water mark); fuera → restringido/pedir conexión |
| **Licencia expiró** | offline: high-water mark la rechaza; online: `expires` → desactivar |
| **Servidor no responde (5xx/timeout)** | NO desactiva; permanece en gracia (falla abierta limitada) |
| **Se supera `maxActivations`** | servidor rechaza nueva activación (conteo activo >= max) al intentar activar en otro equipo |
| **Cambia el dispositivo** (cambia fingerprint/placa/reinstala) | licencia local ya no coincide → solicita reactivación; admin libera slot previo |
| **Licencia revocada** | siguiente validación online → 401/403/404 → se desactiva y pide reactivación |
| **Revocada mientras el PC está offline** | **No se detecta hasta que el equipo vuelva a tener conexión.** Si está dentro de `graceHours`, el Desktop puede seguir funcionando hasta que expire la ventana de gracia o hasta la próxima validación online. No existe manera de revocar un equipo desconectado al instante; el alcance real de una revocación en un equipo offline se limita al final de su gracia actual. Esto es inherente a un sistema tolerante a offline y debe quedar asumido. |
| **Usuario reinstala Windows** | si fingerprint sobrevive (hardware estable) puede reactivar; si cambia → admin libera el slot antiguo |
| **Cambia hardware** | fingerprint estable tolera cambios periféricos; cambio de root → reactivación |
| **Cambia versión de AROMIA** | si la nueva versión está fuera de `min/maxAppVersion`, la validación online la rechaza y pide actualización de licencia/versión |

---

## 7. FUNCIONAMIENTO OFFLINE (gracia)

- **`graceHours`** = **168h (7 días)** **APROBADO (D5)**: ventana máxima que el Desktop puede funcionar sin re-validar online, **anclada al reloj del servidor**. Política de falla **APROBADA (D5): 5xx/timeout → no desactiva** (falla abierta); **401/403/404 → desactiva**.
- El servidor firma `expiresAt` + `graceHours` + `lastValidatedAt`; el Desktop mantiene un **high-water mark** (mayor "tiempo validado" visto) protegido con firma/HMAC.
- **Anti-retroceso de reloj:** el Desktop rechaza cualquier hora local menor al high-water mark válido registrado (si la fecha de Windows se retrocede, la licencia no revive). Además suma al "reloj monotónico" para detectar saltos/potenciales manipulaciones.
- **Redundancia:** guarda el estado de tiempo en ≥2 ubicaciones y usa el máximo válido al cargar.
- **Comportamiento dentro de la gracia:** modo pleno, con validación en background cada N horas.
- **Fuera de gracia sin conexión:** modo restringido (aviso claro) o bloqueo, requiriendo conexión para re-validar. 5xx/timeout → no penaliza (se mantiene en gracia); 401/403/404 → desactiva de inmediato.

**Escenarios offline explícitos (punto 6):**
- **Equipo sin Internet:** funciona en modo pleno mientras no supere el high-water mark + `graceHours`; al superarlo sin poder validar → modo restringido/bloqueo pidiendo conexión.
- **Se cambia la fecha del sistema (retroceso):** el high-water mark rechaza cualquier hora local menor al máximo validado; el reloj monotónico detecta saltos. No se puede "revivir" una licencia vencida retrocediendo la fecha.
- **Se reinstala Windows:** si la raíz del fingerprint es hardware/SMBIOS (opción A, §8.1), el fingerprint se mantiene y la licencia sigue válida; si se incluyó `MachineGuid`, cambia y se requiere reactivación.
- **Cambia hardware:** cambios periféricos no invalidan (fingerprint estable); cambio de raíz (placa) invalida y requiere reactivación (el admin puede liberar el slot antiguo).
- **Copiar licencia a otro PC:** el `deviceFingerprint` firmado no coincide en el otro equipo → la licencia local se rechaza al arrancar (no hay clonación funcional).
- **Revocada mientras el PC está offline:** el efecto se materializa al re-conectar/validar; hasta entonces, y dentro de su gracia actual, el equipo puede seguir funcionando. Es la contrapartida inherente al diseño offline (ver §6.4).

---

## 8. HUELLA DEL DISPOSITIVO (fingerprint)

Diseño conceptual (no se implementa en este paso).

### 8.1 Datos utilizados (preferentemente estables)

Distinguir claramente dos tipos de estabilidad:

| Fuente | ¿Cambia con cambio de hardware? | ¿Sobrevive a reinstalación limpia de Windows? | Uso |
|---|---|---|---|
| `MachineGuid` (registro) | No | **NO** (se regenera al reinstalar) | útil para distinguir instalaciones, **no** como raíz que sobreviva reinstalación |
| UUID placa / SMBIOS (root) | Solo si cambia esa placa | **SÍ** | el componente más estable y que **sí sobrevive reinstalación** |
| Volumen serial del sistema | Posible | Parcial (cambia si se reformatea el volumen) | apoyo adicional |
| Versión de OS | No | Cambia | solo informativo, mejor excluir del hash raíz |

**Regla de diseño:** el fingerprint debe basarse principalmente en el **hardware root (UUID placa/SMBIOS)** para que **sobreviva a la reinstalación limpia** (§6.4). `MachineGuid` **no** debe ser la raíz si queremos que "reinstalar Windows" no invalide la licencia; puede sumarse como factor secundario, pero entonces reinstalar SÍ invalidaría. **DECISIÓN APROBADA (D2):** opción A — raíz = hardware/SMBIOS, para que la licencia sobreviva reinstalaciones limpias. Sujeto a validar la disponibilidad de SMBIOS en prototipo (D8).

**Excluir deliberadamente** componentes periféricos que cambian a menudo: dirección MAC (aditiva), disco de datos secundarios, RAM, GPU, etc.

> Corrección: la versión 1.0 del documento listaba `MachineGuid` como "estable", lo que contradecía §6.4 ("si fingerprint sobrevive a reinstalación"). Queda aclarado que MachineGuid **no** sobrevive a reinstalación limpia.

### 8.2 Normalización y generación
- Recopilar los inputs, normalizarlos (trim, lowercase).
- Concatánalos con separadores estables.
- Aplicar `SHA-256` → fingerprint de 32 bytes (hex).
- El fingerprint es un hash, no expone el hardware crudo.

### 8.3 Qué se guarda
| Dónde | Qué |
|---|---|
| **Servidor** (`devices.fingerprint`) | solo el hash SHA-256; nunca el hardware crudo |
| **Servidor** (`license_activations`) | relación licencia↔dispositivo por id |
| **Local (Desktop)** | el fingerprint se calcula on-the-fly y va en la licencia firmada; puede cachearse el hash |

### 8.4 Cambio parcial de hardware
- Cambios periféricos (disco/RAM/MAC) → fingerprint permanece igual si se basa en componentes centrales → no invalida.
- Cambio del componente raíz (placa/SMBIOS) → fingerprint distinto → la licencia local no coincide → requiere reactivación.
- **Reinstalación limpia de Windows:** si la raíz es el hardware/SMBIOS (opción A de §8.1), el fingerprint **se mantiene** y la licencia sigue válida tras reinstalar; solo se requeriría reactivar si además cambió hardware root. Si se elige la opción B (MachineGuid como raíz), reinstalar invalida y obliga a reactivación.
- **Mitigación por diseño:** el admin puede desactivar el dispositivo anterior y liberar el slot (nunca automático sin control para evitar abuso).

---

## 9. ADMINISTRACIÓN (panel — SOLO arquitectura)

No se implementa todavía. Arquitectura prevista:

- **Frontend admin** (`/admin`, nueva área protegida por rol) cogiendo el `AuthContext` existente + verificación de rol server-side.
- **Rol admin**: se determina por membresía en `admin_users` y se refleja en `app_metadata.role` (Custom Access Token Hook) — nunca `user_metadata` (ver §3.5).
- **Operaciones del panel admin (alcance, punto 8):**
  - **Crear licencia** → `create-license` (genera `license_key` para entrega; el hash se guarda).
  - **Listar/buscar licencias** → lectura admin (por cliente, estado, plan, vencimiento).
  - **Ver cliente** → ver `profiles` del titular de la licencia.
  - **Ver estado / ver vencimiento** → mostrar `status`, `issued_at`, `expires_at`.
  - **Renovar** → actualizar `expires_at` / plan (el Desktop refresca en la siguiente `validate-license`).
  - **Suspender / revocar** → cambiar `status` (efecto al re-validar el Desktop).
  - **Ver dispositivos** → listar `devices` vinculados a la licencia.
  - **Desactivar un dispositivo** → marcar la `license_activations` como `inactive` (libera slot).
  - **Consultar activaciones** → historial de `license_activations` (fechas, estado, dispositivo).
- **Seguridad**: RLS que exige `authorize('admin')`; escrituras sensibles vía Edge Function con secret key (nunca con el claim del navegador). El panel **nunca** ve ni usa la private key de firma; la firma solo ocurre dentro de las Edge Functions en servidor.
- **Separación**: el dashboard de cliente (`/dashboard/mi-licencia`, `/mis-dispositivos`) lee solo sus propios datos **a través de Edge Functions** permitidas, no por acceso directo a tablas sensibles. El área `/admin` es completamente independiente y solo visible con rol admin.

**Modelo de confianza del panel (punto 1):** el único actor que crea y administra licencias es el **admin autorizado** del panel privado `/admin`. La creación de licencias **solo** se ejecuta vía `create-license` en el servidor; no firma la licencia local (eso ocurre en `activate-license`/`validate-license`, cuando existe dispositivo) y nunca expone la private key al navegador/admin.

---

## 10. COMPATIBILIDAD CON AROMIA DESKTOP

Contexto (verificado en investigación previa): `.NET 9` (`net9.0-windows`), WPF, MVVM (CommunityToolkit.Mvvm), EF Core 9 + SQLite, Serilog, arquitectura limpia (`Aromia.Core` / `Aromia.Infrastructure` / `Aromia.App` / `Aromia.Tests`), DI en `App.xaml.cs → ConfigureServices`, `ISettingsService` + `SettingsKeys`, `AppPaths` (BaseDirectory/DataDirectory/...).

### 10.1 Dónde encaja sin romper nada
| Capa | Componente nuevo |
|---|---|
| **Aromia.Core** | Interfaces: `ILicenseService`, `IDeviceFingerprintProvider`, DTOs (`LicensePayload`, `ActivationRequest/Response`), Enums (`LicenseStatus`), excepciones de licencia |
| **Aromia.Infrastructure** | Implementaciones: `LicenseService` (verificación/almacenamiento), `DeviceFingerprintService`, persistencia local (`Licenses/license.json` + estado de tiempo) |
| **Aromia.App** | DI en `App.xaml.cs`; pantalla/View + ViewModel de **Activación** (flujo en `MainViewModel`/`NavigationService`) |
| **Modelo de dominio / Vistas de negocio** | **sin cambios**: no se tocan Entities ni Views de producción/ventas |
| **Aromia.Tests** | pruebas de firma/verificación, fingerprint, high-water mark, casos offline |

### 10.2 Dependencia nueva principal (Desktop)
- **NSec.Cryptography** (libsodium, MIT) para Ed25519 en Windows. El integrado .NET `Ed25519` no sirve.
- Cliente HTTP del licenciamiento (el Desktop usa `HttpClient`; actualmente no hay uno de licencias).
- `System.Security.Cryptography.ProtectedData` (opcional, DPAPI) para el estado de activación.

---

## 11. MIGRACIONES (propuesta, no se ejecutan)

Introducción **aditiva**, no destructiva, sin tocar `profiles`:

- `0002_create_licenses.sql` → tabla `licenses` (PK, FKs, checks, índices, RLS + grants).
- `0003_create_devices.sql` → tabla `devices`.
- `0004_create_license_activations.sql` → tabla `license_activations` (FKs, único compuesto, RLS).
- `0005_create_admin_users.sql` → tabla `admin_users` + función `authorize()` + trigger/claim opcional.
- `0006_app_versions.sql` (si se quiere publicación de versiones) → tabla pública + RLS select público.
- Funciones SQL helper (p. ej. `authorize('admin')`, conteo de activaciones activas) en la migración pertinente.
- **Sin alter/drop de `profiles`** ni de sus políticas RLS existentes (Fase 1 intacta).
- Todas con `create if not exists` idempotentes y versionado numérico secuencial.

Las migraciones de Edge Functions (`supabase/functions/*`) se añaden cuando se implementen (config de funciones, secrets, `withSupabase`).

---

## 12. THREAT MODEL

| Amenaza | Mitigación |
|---|---|
| **Manipulación de licencia local** (editar fecha/estado/customer) | Firma Ed25519: cualquier cambio rompe la firma; verificación ANTES de leer campos |
| **Extracción de claves** | Private key solo en servidor (secret); Desktop solo tiene public key (verificar≠forjar); ningún secreto en repo/.env web |
| **Replay de activación** (re-enviar la misma activación) | upsert idempotente por (licencia, dispositivo) + fingerprint; conteo server-side; rate limit; sellos de tiempo |
| **Clonación de licencia** (copiar license.json a otro PC) | `deviceFingerprint` firmado: no coincide en el otro equipo; se requiere reactivación |
| **Cambio de reloj** (retroceder fecha para revivir vencida) | high-water mark protegido + reloj monotónico + gracia anclada al servidor |
| **Modificación del fingerprint** (forzar otro equipo) | fingerprint es SHA-256 de hardware estable; alterarlo cambia el hash y no coincide con el firmado |
| **Abuso de endpoints** (fuerza bruta de claves/activaciones) | rate limit por IP y por licencia; validación de esquema (zod); conteo server-side |
| **Filtración de private key** | env vars cifradas/screts; rotación vía `keyId` sin invalidar licencias; nunca en repo |
| **Acceso indebido a datos de otros usuarios** | RLS (`auth.uid() = id`), `authorize('admin')` (app_metadata/DB check, nunca user_metadata), acceso sensible solo vía Edge Function con secret key |

---

# FASE 2 — DECISIÓN ARQUITECTÓNICA

### Arquitectura propuesta
Web (React/Vite) + Supabase (Auth, PostgreSQL, RLS, Edge Functions en Deno) + AROMIA Desktop (.NET 9/WPF). Firma **Ed25519**: private key solo en Edge Function; public key embebida en Desktop; verificación en Desktop con **NSec.Cryptography**. Clientes web leen solo vía Edge Functions autorizadas; RLS protege tablas; nuevo sistema de API keys (`sb_publishable_*` web, `sb_secret_*` servidor).

### Tablas definitivas (Fase 2)
`licenses`, `devices`, `license_activations`, `admin_users` (+ opcional `app_versions` pública). Todas con RLS, grants mínimos, accesos sensibles solo vía servidor. `profiles` queda intacto.

### Edge Functions definitivas (núcleo)
`create-license` (admin), `activate-license`, `validate-license`, `deactivate-device`, `get-latest-version`. (Admin CRUD de gestión → paso posterior al panel).

### Flujo de activación
Desktop → `activate-license` (license_key + fingerprint) → validación server (estado, conteo, versión) → upsert device + activación → firma payload → Desktop verifica con public key → guarda `license.json` → modo pleno.

### Flujo de validación
Firma → fingerprint → expiración/ventana (high-water mark) → online silencioso periódico: 401/403/404 desactiva, 5xx/timeout no desactiva, refresca gracia.

### Estrategia offline
`graceHours` anclada al servidor; high-water mark + reloj monotónico (anti-retroceso de reloj); redundancia del estado; modo pleno dentro de gracia, restringido fuera sin penalizar por fallos de red.

### Estrategia de fingerprint
SHA-256 de componentes estables (MachineGuid, volumen, placa opcional), normalizados; sin MAC/disco periférico; solo se almacena el hash; tolerante a cambios periféricos; cambio de raíz → reactivación con liberación de slot por el admin.

### Estrategia criptográfica
Ed25519. Servidor (Deno nativo) firma; Desktop (NSec/libsodium) verifica. `keyId` para rotación. `license_key` base32 + checksum; hash SHA-256 en BD. Verificación de firma primero.

### Seguridad / RLS
RLS en todas las tablas nuevas; grants revocados; rol admin solo server-side (app_metadata/hook + `authorize()`), nunca `user_metadata`; sin secrets en web/Desktop; acceso sensible vía Edge Functions con secret key; rate limit en endpoints.

### Cambios necesarios en Desktop
`ILicenseService`, `IDeviceFingerprintProvider`, DTOs/Enums en `Aromia.Core`; `LicenseService` + fingerprint + almacenamiento local en `Aromia.Infrastructure`; DI en `App.xaml.cs`; pantalla de activación (View+VM) y validación de arranque en `Aromia.App`; tests en `Aromia.Tests`. Lógica de negocio (ventas/producción) intacta.

### Dependencias nuevas necesarias
- **Desktop:** `NSec.Cryptography` (obligatoria), `System.Security.Cryptography.ProtectedData` (opcional DPAPI), ya existentes `HttpClient`.
- **Web:** posiblemente `zod` (validación) si se reutiliza patrón; SDK `@supabase/server` en Edge Functions; ninguna dependencia de frontend nueva para el núcleo (el cliente ya usa `@supabase/supabase-js`). No se agregan dependencias al proyecto web salvo lo estrictamente justificado.

### Orden exacto de implementación por etapas (tras tu aprobación)
1. **E1 — Infraestructura**: migraciones `licenses/devices/license_activations/admin_users` + `authorize()` + RLS. (Web: nada aún).
2. **E2 — Edge Functions base**: `get-latest-version`, `create-license` (admin), y configuración de secrets (private key + `key_id`).
3. **E3 — Activación/validación**: `activate-license`, `validate-license`, `deactivate-device`.
4. **E4 — Desktop**: contrato `ILicenseService` + fingerprint + verificación/almacenamiento + pantalla de activación + validación de arranque + gracia/high-water mark.
5. **E5 — Web (dashboard cliente)**: conectar `/dashboard/mi-licencia` y `/mis-dispositivos` a `validate-license`/lectura vía EF; activar `DownloadCTA` con `get-latest-version`.
6. **E6 — Panel admin** (fase separada posterior): `/admin` + CRUD de licencias/activaciones.
7. **E7 — Hardening**: tests de amenazas/offline, rate limit fino, revisión de RLS.

### Decisiones (todas APROBADAS — 01/09/2026)
- **D1 — Activación:** solo LicenseKey (sin sesión web). Mitigado con `max_activations`, conteo server-side, rate limit. (§4.2)
- **D2 — Raíz del fingerprint:** hardware/SMBIOS (sobrevive reinstalación). (§8.1)
- **D3 — Rol admin:** hook JWT `app_metadata.role` + verificación en BD en operaciones sensibles. (§3.5)
- **D4 — Acceso cliente:** solo vía Edge Function (sin RLS directo ni vista). (§3.2)
- **D5 — Gracia:** `graceHours` = **168h** (7 días); falla abierta (5xx/timeout no desactiva; 401/403/404 sí). (§7)
- **D6 — Versiones:** tabla `app_versions`. (§4.5, §11)
- **D7 — Revocación offline:** aceptada (efecto al re-conectar, dentro de gracia). (§6.4, §7)
- **D8 — SMBIOS/hardware como fuente:** confirmado, sujeto a validación en prototipo Desktop.
- **D9 — NSec.Cryptography:** confirmada como única opción de firma Ed25519 en Windows.

### Riesgos pendientes / controlados
- Disponibilidad de SMBIOS/UUID de placa (varía por fabricante) — a validar en prototipo de Desktop (E4).
- `NSec.Cryptography` es la única opción en Windows (investigación §hallazgo) — sin alternativa dentro del stack actual.
- Latencia del claim de rol en RLS (asumida; mitigada con verificación en BD en operaciones sensibles).

---

## APROBACIONES NECESARIAS ANTES DE IMPLEMENTAR

**Estado: TODAS APROBADAS el 01/09/2026.**

1. ✅ **(D1)** Identidad de activación: activar solo con `license_key`. → §4.2
2. ✅ **(D2)** Raíz del fingerprint: hardware/SMBIOS (sobrevive reinstalación), opción A. → §8.1
3. ✅ **(D3)** Mecanismo de rol admin: hook JWT + verificación en BD. → §3.5
4. ✅ **Algoritmo y claves**: Ed25519, private key solo en Edge Function, public key en Desktop, NSec en Desktop.
5. ✅ **Tablas definitivas**: `licenses`, `devices`, `license_activations`, `admin_users` + `app_versions`, con RLS.
6. ✅ **(D4)** Acceso del cliente: **solo vía Edge Function**. → §3.2
7. ✅ **Edge Functions núcleo**: `create-license`, `activate-license`, `validate-license`, `deactivate-device`, `get-latest-version`.
8. ✅ **Formato de licencia v1** y los campos firmados (§5; todo el payload va firmado).
9. ✅ **(D5)** `graceHours` = 168h y falla abierta (5xx/timeout no desactiva).
10. ✅ **Fingerprint**: fuentes §8.1, solo se almacena el hash.
11. ✅ **Dependencias Desktop**: `NSec.Cryptography` (+ opcional `ProtectedData`).
12. ✅ **Orden de etapas** E1→E7.
13. ✅ **Panel admin**: se difiere a una sub-fase posterior (E6).
14. ✅ **(D7)** Revocación offline diferida aceptada. → §6.4/§7

> **Diseño aprobado. Se inicia la implementación por etapas (E1→E7). La private key
> Ed25519 se generará en el servidor (secrets de Edge Function) en la etapa E2.**

> **A partir de aquí, el diseño queda aprobado y se procede a la implementación por
> etapas (E1→E7), respetando el orden definido. La private key Ed25519 se generará en
> el servidor (secrets de Edge Function) en la etapa E2.**

### Historial de revisiones
- **v2.0** — Aprobado (todas las decisiones D1-D9 resueltas; se fijan valores: graceHours=168h, raíz hardware/SMBIOS, activación solo con LicenseKey, rol admin hook JWT+BD, acceso cliente solo vía Edge Function, `app_versions` tabla).
- **v1.1** — Revisión: correcciones (create-license no firma, MachineGuid no sobrevive reinstalación, todo el payload firmado, revocación offline explícita, reglas de estados, RLS cross-tenant, alcance panel admin, mecanismo de rol).

### Correcciones aplicadas en la revisión v1.1
1. **`create-license` NO firma la licencia local** (no hay `deviceFingerprint`): la firma ocurre en `activate-license`/`validate-license`. (§1.2, §4.1)
2. **Riesgo de activación sin sesión web** identificado y expuesto como decisión pendiente (D1). (§4.2)
3. **§5.2 aclarado**: TODO el payload está firmado; lo que no viaja firmado son la firma misma, el estado local y el `license_key` en claro. (§5.2)
4. **`MachineGuid` NO sobrevive reinstalación limpia**: corregida la contradicción con §6.4; se propone raíz hardware/SMBIOS (opción A). (§8.1, §8.4)
5. **Recuperación offline explícita**: revocación/suspensión solo se materializa al re-validar; un equipo offline puede seguir dentro de su gracia. (§6.4, §7)
6. **Estados**: reglas exactas de qué puede/no puede hacer cada estado y sus transiciones. (§1.3)
7. **RLS**: garantía explícita de aislamiento entre usuarios (cross-tenant) en las tres tablas. (§3.2)
8. **Panel admin**: alcance completo de operaciones y modelo de confianza (solo admin firma vía servidor, sin private key en el navegador). (§9)
9. **Mecanismo de rol admin** fijado (hook + verificación en BD). (§3.5)

*Fin del diseño de Fase 2. A la espera de tus decisiones y aprobaciones.*
