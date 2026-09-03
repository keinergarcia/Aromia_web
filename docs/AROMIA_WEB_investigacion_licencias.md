# AROMIA_WEB — Informe de Investigación Técnica: Licenciamiento + Arquitectura Definitiva

**Versión:** 3.0 (Investigación — Fase 0, previa a Fase 1)
**Fecha:** 31/08/2026
**Estado:** Documento de investigación. **No se ha generado ni modificado código.**

Este informe responde la investigación solicitada, verifica la arquitectura real de AROMIA Desktop, y termina con una **recomendación concreta** de arquitectura de licenciamiento para tu aprobación antes de la Fase 1.

---

## SOBRE LA PROPUESTA INICIAL (Ed25519) — HALLAZGO IMPORTANTE

Tu instinto de no asumir por diseño era correcto. La investigación reveló un **problema técnico concreto** en mi recomendación inicial:

**El `System.Security.Cryptography.Ed25519` integrado en .NET NO está soportado en Windows.**
- En la propuesta oficial del runtime de .NET (dotnet/runtime #63174), la clase `Ed25519` (y `Ed25519OpenSsl`) lleva explícitamente `[UnsupportedOSPlatform("windows")]`. Microsoft solo la implementó sobre OpenSSL (Linux/macOS).
- Como **AROMIA Desktop es WPF sobre Windows**, no podemos usar la clase integrada de .NET para Ed25519 en el cliente.

**Consecuencia:** El cliente Windows debe usar una biblioteca de terceros para Ed25519, o cambiar de algoritmo. La opción recomendada por la industria y la referencia de referencia (Keygen) es **NSec.Cryptography** (basado en libsodium, MIT, compatible con Windows, API `Ed25519.Sign/Verify`). Esto NO cambia decisiones de arquitectura ni de seguridad; solo ajusta la biblioteca concreta en el cliente .NET/WPF.

---

## 1. Datos verificados del proyecto AROMIA Desktop (sin modificarlo)

Revisé el repositorio hermano `C:\Users\Keine\Desktop\PROYECTOS\Aromia`:

- **Stack:** .NET 9 (`net9.0-windows`), WPF, MVVM (CommunityToolkit.Mvvm), EF Core 9 + SQLite, Serilog.
- **Arquitectura limpia:** `Aromia.Core` (Entidades, Interfaces, Servicios, DTOs, Enums, Excepciones), `Aromia.Infrastructure` (Data/AppDbContext, Servicios como AppPaths/BackupService), `Aromia.App` (Views, ViewModels, Services), `Aromia.Tests`.
- **DI:** `App.xaml.cs → ConfigureServices(IServiceCollection, IPathProvider)` registra todos los servicios. Ahí se registraría el licenciamiento.
- **Persistencia de claves-valor:** `ISettingsService` (`GetAsync`/`SetAsync`) respaldado por la entidad `AppSetting` en SQLite; hay una clase `SettingsKeys` con claves constantes.
- **Rutas:** `AppPaths` expone `BaseDirectory`, `DataDirectory` (`Aromia.db`), `LogsDirectory`, `BackupsDirectory`, etc. — lugar natural para una carpeta `Licenses/`.
- **Navegación:** `MainViewModel` define `NavItem` + `NavigationService`; una pantalla de activación encajaría en este flujo.
- **Sin mecanismo de licencia existente:** no hay `ILicenseService` ni uso de `HttpClient`. El único "License" que existe es `QuestPDF.Settings.License = LicenseType.Community` (licencia interna de la librería de PDFs, no un sistema de licencias).
- **Publicación:** carpeta `Aromia_1.0.0_Cliente_Test` (deploy self-contained).

**Conclusión de esta verificación:** No hay interfaces, servicios, carpetas ni mecanismos de licenciamiento que inventar de forma conflictiva. La integración futura es **greenfield** y cabe limpiamente en `Aromia.Core` (contrato) + `Aromia.Infrastructure` (implementación/almacenamiento) + `Aromia.App` (DI y pantalla de activación), sin tocar Entities ni Views del dominio de negocio.

---

## 2. Supabase Auth + RLS (clientes y administradores)

**Fuente:** Supabase Docs (Row Level Security), guías oficiales RBAC/custom claims, y análisis de incidentes reales (Lovable 2025).

### Principios confirmados
- **RLS se activa en TODA tabla expuesta.** Una tabla en schema expuesto sin RLS es legible/escribible por cualquiera. Activar RLS sin policies devuelve filas vacías (no error).
- **Grants ≠ Policies.** Hay que revocar grants innecesarios (`anon`/`authenticated`) y conceder solo lo mínimo, además de escribir policies por operación (`select`/`insert`/`update`/`delete` por separado).
- **Autorización robusta:** nunca usar `user_metadata` (que el cliente puede reescribir con `auth.updateUser()`) para roles → escalada de privilegios. Usar **`app_metadata`** (solo servidor) o un **Custom Access Token Hook** que inyecta el rol en el JWT, y una función **`authorize()` `SECURITY DEFINER` con `search_path=''`**.
- **JWT es una fotografía:** un cambio de rol tarda hasta que expire el token. Para revocación inmediata, leer la tabla de roles en la policy (DB check); para roles de cambio lento, usar el claim del JWT.
- **`service_role`/secret key:** salta RLS totalmente (modo dios). **Solo en servidor**, nunca en frontend. Crear el cliente admin solo después de verificar la identidad del llamador (orden de verificación).
- **Pruebas:** la SQL Editor del dashboard salta RLS; probar policies con el SDK (anon vs authenticated).

### Aplicación a AROMIA_WEB
| Tabla | Rol `anon` | Rol `authenticated` |
|---|---|---|
| `customers`, `licenses`, `license_activations`, `devices`, `admin_users` | sin acceso | solo admin (vía `authorize('admin')`) |
| `app_versions` (pública) | `select` de campos públicos SOLO (sin `download_url` sensible) | según política de descarga |

Panel `/admin`: autenticación Supabase Auth + policy que exige rol admin. Los cambios de licencia (crear, suspender, revocar) se ejecutan vía **Edge Function** con `service_role`/secret key del lado servidor y validación propia de rol, para no exponer permisos en el cliente.

---

## 3. Supabase Edge Functions (operaciones sensibles)

**Fuente:** Supabase Docs (Securing Edge Functions, Secrets, API keys nuevas 2025).

- Las Edge Functions corren en **Deno** y tienen acceso a `SUPABASE_URL`, `SUPABASE_SECRET_KEYS` (nuevo, reemplaza `SERVICE_ROLE_KEY`) y `SUPABASE_JWKS` automáticamente.
- **Existe un nuevo sistema de API keys (2025):** publishable (`sb_publishable_...`, seguro en browser) vs secret (`sb_secret_...`, solo servidor; salta RLS; **rechaza usarse en browser via User-Agent**; rotación por clave individual). Preferir el nuevo sistema sobre `service_role`/`anon`.
- **SDK `@supabase/server`** recomienda `withSupabase({ auth: 'user' | 'secret' | 'publishable' | 'none' }, handler)` que valida JWT/keys y entrega `ctx.supabase` (respeta RLS) y `ctx.supabaseAdmin` (salta RLS). `verify_jwt = false` + auth en el SDK.
- **Secrets:** claves privadas de firma de licencia se almacenan en env vars de Edge Function (nunca en repo/frontend/Desktop).

**Aplicación:** `activate-license`, `validate-license`, `create-license`, `get-latest-version` como Edge Functions con `auth` adecuado; la **clave privada de firma Ed25519** vive solo en el entorno de la Edge Function.

---

## 4. ¿Ed25519 o RSA para firmar licencias offline?

**Fuente:** análisis de seguridad (trafficorchestrator, infosecwriteups, keygen.sh), cryptops original (ed25519.cr.yp.to), y comparativas.

| Propiedad | Ed25519 | RSA-2048/3072 | ECDSA P-256 |
|---|---|---|---|
| Tamaño firma | **64 bytes** | 256–384 bytes | 64 bytes |
| Tamaño clave pública | **32 bytes** | 256–384 bytes | 64 bytes |
| Firma determinista (sin RNG) | **Sí** | No (padding) | No (RNG crítico) |
| Ataques de padding | **Inmune** | Vulnerable si mal OAEP | N/A |
| Anti side-channel | **Diseñado** | Depende impl. | Depende impl. |
| Velocidad verificación | **muy rápida** | rápida | rápida |
| Seguridad ~128-bit (equiv. AES) | **Sí** | Sí (2048+) | Sí |

**Veredicto: para firmar licencias, Ed25519 es la mejor opción moderna**, igual que en la mayoría de sistemas profesionales y en la referencia de keygen.sh. RSA solo se justifica por compatibilidad heredada (no aplica aquí). **Salvo un matiz de plataforma** (ver § "HALLAZGO"): en el cliente Windows .NET no se usa la clase integrada; se usa **NSec.Cryptography (libsodium)** para Ed25519. En el servidor (Edge Function Deno) Ed25519 se soporta nativamente (`crypto.subtle` / librería estándar).

---

## 5. ¿Dónde debe vivir la clave privada?

- **Clave privada Ed25519** (la que firma): **EXCLUSIVAMENTE en el servidor** → Edge Function de Supabase (env var / secreto de función). NUNCA en React/JS público, archivos descargables ni en AROMIA Desktop.
- **Clave pública Ed25519** (la que verifica): **embebida en AROMIA Desktop** (constante/además). Es pública por diseño; solo verifica, no puede falsificar.
- **Ataque de copia de instalación:** aunque el atacante extraiga la clave pública del binario, **no puede forjar una licencia válida** porque no tiene la privada. Este es todo el límite criptográfico: la única vía de falsificación es comprometer el servidor.
- La licencia local NO es texto editable: es JSON **firmado**. Modificar fecha de expiración, identificación, estado, dispositivo o producto **rompe la firma** y la licencia se rechaza al arrancar.

---

## 6. ¿Qué debe contener EXACTAMENTE la licencia firmada?

Formato de licencia local firmada (JSON) — campells internos verificados:

```
{
  "v": 1,                 // versión del formato
  "licenseId": "uuid",    // id de la licencia en Supabase
  "keyId": "...",         // identificador de la clave (permite rotación de firma)
  "customer": "nombre/empresa",  // opcional informativo
  "product": "AROMIA",
  "plan": "perpetual",    // sin pricing; solo identificador de tipo aprobado
  "status": "active",
  "maxActivations": 1,
  "expiresAt": "2030-01-01T00:00:00Z",  // null = sin vencimiento
  "issuedAt": "2026-08-31T00:00:00Z",
  "graceHours": 168,      // período offline permitido (7 días)
  "deviceFingerprint": "<sha256 del equipo donde se activa>",
  "appVersion": "1.0.0"   // versión mínima/actual licenciada
}
```

Firma = **Ed25519 sobre el JSON canónico (bytes exactos)**. La verificación en Desktop: (1) verifico firma con clave pública → si no, inválida; (2) luego leo campos (producto, estado, expiración, fingerprint). **El orden importa: autenticidad ANTES que política** (patrón SIOS confirmado).

Formato de presentación del LicenseKey (el que escribe el cliente):
- `AROM-` + caracteres aleatorios criptográficos (base32/base64url) con suficiente entropía (~128 bits) y checksum opcional, generado en `create-license`.
- Se guarda en BD **hash (SHA-256)** en `licenses.license_key` (o columna hash) para que una fuga de BD no exponga claves planas. La clave en claro solo se muestra al crearla/durante entrega.

---

## 7. ¿Qué debe guardar AROMIA localmente?

- **Licencia local firmada** (el JSON firmado del §6), almacenada en `BaseDirectory/Licenses/license.json` (vía `AppPaths`).
- **Estado de tiempo (high-water mark)** protegido: último tiempo validado + valor de reloj monotónico, firmados/HMAC (para detectar retroceso de reloj). Se guarda en un archivo/licencia protegido en la carpeta de licencias (no editable sin romper firma/HMAC).
- **(Opcional, recomendado) cifrado de repositorio de credencial de activación** con DPAPI `ProtectedData` (`DataProtectionScope.CurrentUser`) del paquete `System.Security.Cryptography.ProtectedData` (Windows). Protege el identificador de instalación y dificulta copiar el estado a otro usuario/PC.
- Se recomienda **redundancia**: guardar el estado de tiempo en 2 ubicaciones y usar el máximo válido en carga.

**NUNCA localmente:** clave privada, secretos del servidor, Service/Secret key, credenciales admin.

---

## 8. ¿Cómo debe validar la licencia la aplicación (Desktop)?

Flujo de arranque:
1. Cargar licencia local. **Verificar firma Ed25519** con la clave pública embebida (NSec). Si la firma falla → inválida (no seguir).
2. Verificar **fingerprint** (huella del equipo actual) = el fingerprint embebido en la licencia. Si difiere → inválida en este equipo.
3. Verificar **expiración**: `expiresAt` y período de gracia, usando el **high-water mark** (reloj no puede retroceder).
4. Si pasó el período offline y no ha validado con servidor → modo restringido o solicitar reactivación.
5. En background, cada N horas, validar con el servidor; **HTTP 401/403/404 → desactivar; 5xx/timeout → no desactivar** (falla abierta para no perjudicar a usuarios legítimos; la gracia lo limita).

**Patrón confirmado por múltiples fuentes (DotScramble, LicensSpring, bugnet, technetexperts).**

---

## 9. ¿Cómo se registra una activación en Supabase?

Al activar (Edge Function `activate-license`):
1. Recibe `licenseKey` + `deviceFingerprint` + `deviceName` + `os` + `appVersion`.
2. Valida: licencia existe → activa → no vencida → producto AROMIA → fingerprint autorizado/no superado → `activation_count < max_activations`.
3. Si OK: hace **upsert** en `devices` (por fingerprint) y crea fila en `license_activations` (trazabilidad), incrementa `activation_count`, actualiza `activated_at`/`last_validated_at`.
4. Firma la licencia local y la devuelve; el Desktop la guarda.

Todo con el cliente `ctx.supabaseAdmin` (secret key) dentro de la Edge Function (las tablas no tienen RLS hacia `anon`, por lo que el cliente no puede escribir directamente).

---

## 10. ¿Cómo se limita una licencia a 1 o varios computadores?

- `max_activations` en la licencia (p. ej. 1).
- Server-side count: `activation_count` de activaciones **activas** (= filas en `license_activations` ↔ `devices` activos). Si `count >= max_activations` → rechaza nueva activación.
- El admin puede **desactivar una activación** (libera un slot) o revocar el dispositivo.
- Esto evita la práctica "una licencia compartida entre N equipos". La validación es server-side en la activación (no solo comparar cadenas).

---

## 11. ¿Qué ocurre si el cliente cambia componentes del computador?

**Recomendación (patrón probado):** el fingerprint debe basarse en componentes **estables y centrales**, NO en componentes periféricos que se cambian con frecuencia (disco, MAC).
- EUERTO: cambios menores (disco, RAM, tarjeta de red → MAC afirmada/aditiva) **no invalidan** la licencia si se usa un fingerprint basado en lo estable.
- Cambio del componente raíz (p. ej. placa/reinstalación de Windows con MachineGuid nuevo) → fingerprint cambia → activación ya no coincide → se requiere reactivación (que el admin puede liberar el slot anterior).
- Policy recomendada (a definir contigo): permitir reactivación liberando el slot anterior si se demuestra el caso; no exponerlo al cliente como algo automático sin control.

---

## 12. ¿Qué ocurre si reinstala Windows?

- El fingerprint incluye `MachineGuid` (registry), que **cambia en una reinstalación limpia**. Si el fingerprint depende de él, la licencia local vinculada ya no coincide tras reinstalar.
- **Mitigación (diseño a elegir):**
  - Opción A (recomendado por comodidad): fingerprint basado en hardware estable (BIOS/SMBIOS UUID + volumen) que **sobrevive reinstalación**; se envía a servidor y se re-vincula con reactivación.
  - Opción B: implementar "migración de activación" en el panel admin: el admin revoca el dispositivo antiguo y activa el nuevo.
- Lo importante: **nunca dejar que usuario reutilice en N máquinas a la vez**; el server siempre cuenta activaciones activas.

---

## 13. ¿Qué ocurre si el cliente no tiene Internet (modo offline / gracia)?

**Diseño confirmado:**
- Tras activación online, se guarda una **licencia local firmada** con `graceHours` (período offline, p. ej. 7 días) que caduca si no hay re-validación.
- La app sigue funcionando offline mientras la licencia local firma válida y dentro del período de gracia.
- **Gracia anclada al servidor**: el servidor firma el `expiresAt`/ventana con su reloj; el Desktop guarda un **high-water mark** de "último validado" protegido → el usuario **no puede extender el periodo indefinidamente** quedándose offline ni rebobinar el reloj.
- Al volver a tener conexión: re-validación silenciosa y refresco de la ventana de gracia.

---

## 14. ¿Qué ocurre si modifica manualmente el archivo local de licencia?

- Al modificar cualquier campo (expiración, fingerprint, producto, estado), la **firma Ed25519 deja de ser válida** → al arrancar se rechaza (verificación de firma ANTES de leer campos).
- Si también elimina el archivo → la app entra en estado no activado y pide activación online.
- Estado de tiempo está protegido (HMAC/firma + redundancia) → retroceso de reloj no revive una licencia vencida.

---

## 15. ¿Qué ocurre si intenta usar la misma licencia en otro PC?

- El segundo PC tiene otro fingerprint → al activar, el servidor ve `activation_count >= max_activations` → **rechaza** (si max=1 y el primero sigue activo).
- Si el admin desactiva el primer dispositivo, el segundo puede activar.
- La licencia local firmada contiene el fingerprint del primer equipo → copiar el archivo a otro PC no sirve: fingerprint no coincide (patrón SIOS confirmado).

---

## 16. Seguridad transversal (todas las capas)

- **Nada** de Service/Secret key, clave privada, o credenciales admin en React/JS/descargables/Desktop.
- **Edge Functions** = frontera de confianza; doble cliente (`ctx.supabase` respeta RLS, `ctx.supabaseAdmin` no), y el admin solo después de verificar rol.
- **RLS** en todas las tablas + revocar grants de más; roles en `app_metadata`/custom hook (nunca `user_metadata`).
- **Rate limiting** en `activate-license`/`validate-license`/login/firma (por IP y por licencia) — fuerza bruta de claves.
- **Validación de entrada** con esquemas (zod) en Edge Functions.
- **Errores**: nunca exponer excepciones internas; logs estructurados.
- **Nuevo sistema de API keys (2025)** en lugar de `service_role`/`anon` (rotación individual + bloqueo por User-Agent).
- **`.gitignore`** excluye `.env*`, claves, certs, DBs, logs, `node_modules`, build outputs.

---

## 17. LO QUE QUEDA PARA LA FASE 2 (fuera de la primera entrega)

La Fase 1 aprobada NO construye el sistema de licencias. Queda para una fase posterior (tras esta aprobación de arquitectura):
- Edge Functions (`activate-license`, `validate-license`, `create-license`, `get-latest-version`).
- Tablas `licenses`, `license_activations`, `devices`, `admin_users` (la Fase 1 solo prepara infraestructura Supabase necesaria sin crear módulos completos).
- `ILicenseService`/`LicenseService`, fingerprint, firma, adecuación en AROMIA Desktop.
- Client/account dashboard.
- Tests de seguridad y del flujo completo.

**La Fase 1 entrega:** proyecto Vite+React+TS+Tailwind, sitio público responsive (Inicio, Qué es AROMIA, Características, Capturas, Descarga, Información de licencias, Contacto/Soporte), conexión Supabase e infraestructura mínima, estructura para `/admin` con auth básica si la arquitectura lo permite, y sección de descarga preparada (sin enlace definitivo ni protección). No se toca AROMIA Desktop.

---

# RECOMENDACIÓN CONCRETA DE ARQUITECTURA DE LICENCIAMIENTO

1. **Algoritmo de firma:** **Ed25519**.
   - Servidor (Edge Function Deno): Ed25519 nativo (crypto).
   - Cliente Windows (.NET/WPF): **NSec.Cryptography** (libsodium, MIT) — porque el `Ed25519` integrado de .NET no soporta Windows. Clave pública embebida.
2. **Clave privada** → solo en env de Edge Function; **clave pública** → embebida y verificada en Desktop.
3. **LicenseKey**: `AROM-` + aleatorio criptográfico (~128 bits) + checksum; en BD guardar **hash SHA-256** de la clave.
4. **Activar/validar/firmar** → Edge Functions con `@supabase/server`, secret key (nuevo sistema de API keys), creación del cliente admin solo tras verificar rol.
5. **Licencia local firmada (JSON §6)** con **verificación de firma ANTES de leer campos**; almacenada en `BaseDirectory/Licenses/`; estado de tiempo protegido (high-water mark firmado) + DPAPI `ProtectedData` opcional.
6. **Fingerprint estable** (sin depender de MAC): `SHA-256( MachineGuid + volume serial + OS )` con tolerancia a cambios de hardware periférico; sobrevive reinstalación si se basa en hardware estable (mitigación en panel).
7. **Período offline/gracia:** ventana firmada por el servidor (p. ej. 7 días), anclada al reloj de servidor + high-water mark en cliente; re-validación silenciosa en background; 401/403/404 → desactivar, 5xx/timeout → no.
8. **Límite de máquinas:** `max_activations` + conteo server-side de activaciones activas; desactivación de dispositivos por el admin.
9. **RLS + RBAC** según §2 y §16 (rol admin en `app_metadata`/hook, nunca `user_metadata`).
10. **Revocación/expiración:** estados `active/suspended/expired/revoked` + control por servidor; licencia revocada/vencida deja de validar.

**Fase 1 de la primera entrega, sin sistema de licencias ni modificación de AROMIA Desktop**, tal como aprobaste.

---

*Fin del informe de investigación. A la espera de tu aprobación o modificación de este diseño antes de iniciar la Fase 1.*
