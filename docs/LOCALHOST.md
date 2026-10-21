# Correr Mikhuna en localhost (web) — guía de trabajo

> Cómo levantar la app en el navegador para probar y verificar cambios, y cómo verla con el tamaño de un celular.
> Para generar el APK de Android ver [COMPILACION_APK_ANDROID.md](COMPILACION_APK_ANDROID.md). Para el historial de
> cambios y cómo regresarlos ver [CHANGELOG.md](CHANGELOG.md). Para la IA ver [IA.md](IA.md).
>
> Adaptado de la guía equivalente de NovaSmart. Todo lo que dice acá fue comprobado en este repo; lo que no se pudo
> comprobar está marcado como "no verificado".

---

## 0. Lo más importante: hay una sola base de datos y puede estar pausada

Localhost solo levanta la **interfaz**. El inicio de sesión, el registro, los planes, los pedidos y la función de IA
viven en **un único proyecto de Supabase**, *mikhuna* (ref `lvkweyiwzkqtojlylinc`, región `sa-east-1`, São Paulo). No
existe una copia de pruebas: todo lo que se guarde desde localhost queda en ese proyecto.

Las tablas (`planes`, `pedidos`) se crean con las migraciones de `supabase/migrations/`. En un proyecto nuevo, o después
de agregar una migración:

```bash
npx supabase link --project-ref lvkweyiwzkqtojlylinc   # pide la contraseña de la base de datos
npx supabase db push                                    # aplica las migraciones que falten
```

**El plan gratuito de Supabase pausa los proyectos por inactividad.** Un proyecto pausado se reconoce así:

| Señal | Qué se ve |
|---|---|
| App | Gira unos segundos al abrir y cae al login; registrar o ingresar falla con "Failed to fetch" |
| Consola del navegador | `net::ERR_NAME_NOT_RESOLVED` hacia `lvkweyiwzkqtojlylinc.supabase.co` |
| Terminal | `npx supabase projects list` muestra `"status":"INACTIVE"` |
| DNS | `nslookup lvkweyiwzkqtojlylinc.supabase.co` responde "Non-existent domain" |

**Solución:** entrar al dashboard de Supabase, abrir el proyecto *Mikhuna* y pulsar **Restore project**. Tarda unos
minutos; cuando `projects list` muestre `ACTIVE`, recargar la app. Mientras esté pausado, la función `generar-plan`
tampoco responde.

Comprobar que está arriba:

```powershell
npx supabase projects list
```

---

## 1. Requisitos (una sola vez)

| Qué | Versión comprobada | Nota |
|---|---|---|
| Node.js | 22.16.0 | `node -v` |
| npm | 10.9.2 | `npm -v` |
| Git | cualquiera reciente | |

```powershell
cd <carpeta del repo>
npm install
```

### Variables de entorno

La app lee sus claves de **`.env.local`**, que está en `.gitignore` y **no viaja por git**. En otra PC hay que copiarlo a
mano (nunca por git ni por chat sin cifrar). Expo lo carga solo: al arrancar la terminal muestra `env: load .env.local`.

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY

# opcionales, solo para el inicio de sesión automático en desarrollo (§5)
EXPO_PUBLIC_DEV_EMAIL
EXPO_PUBLIC_DEV_PASSWORD

# solo para scripts/supabase/aplicar-plantillas-correo.ps1 (la app no las lee)
RESEND_API_KEY        # Resend (recomendado); la clave empieza con re_
SMTP_REMITENTE        # remitente verificado en Resend, p. ej. no-reply@tu-dominio
SMTP_GMAIL_USER       # alternativa: Gmail
SMTP_GMAIL_APP_PASSWORD
```

Solo van la URL y la clave pública (`anon`). La clave de Gemini **no está en el cliente**: es un secreto del proyecto de
Supabase (`GEMINI_API_KEY`, ver [IA.md](IA.md)). Sin estas dos variables la app abre pero no conecta con Supabase.

Las plantillas de correo (confirmar registro y recuperar contraseña) se suben con:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/supabase/aplicar-plantillas-correo.ps1
```

Ese script usa el token que deja `npx supabase login` y solo cambia el SMTP si `.env.local` trae con qué configurarlo.

---

## 2. Levantar el servidor web

```powershell
npm run web            # = expo start --web  →  http://localhost:8081
```

La primera vez Metro compila el bundle y puede tardar; cuando `http://localhost:8081` responde, abrirlo. Los cambios de
código se recargan solos (hot reload). Para detenerlo: `Ctrl + C`.

Otro puerto (por ejemplo para tener dos sesiones a la vez):

```powershell
npx expo start --web --port 8082
```

### Con Claude Code (panel de vista previa)

`.claude/launch.json` define el servidor `mikhuna-web` (puerto 8081); se arranca por nombre desde el panel.

Comprobar que responde:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost:8081     # 200 = listo
```

---

## 3. Verlo como celular

En web la app se limita a **430 px de ancho y se centra** en la ventana; los lados quedan en color `ink`. Lo hace
`PhoneFrame` en `app/_layout.tsx` y solo corre en web (en el celular no hace nada). En una ventana más angosta que 430 px
ocupa todo el ancho. Para ver el tamaño exacto de un modelo de celular, fijar el dispositivo en el navegador:

| Dónde | Cómo |
|---|---|
| Chrome / Edge | `F12` → `Ctrl + Shift + M` (barra de dispositivos) → elegir *iPhone 14 Pro* o escribir `390 × 844`. Recargar la página después de cambiar el dispositivo. |
| Panel de Claude Code | Menú *Viewport* del panel → *Mobile* (375 × 812). Volver a *Desktop* al terminar. |
| Celular real | Misma red Wi-Fi: `npx expo start` y abrir el código QR en Expo Go (no verificado en este repo). Si la red bloquea la conexión entre dispositivos (pasó en la red del campus), probar `npx expo start --tunnel` (no verificado). |

Tamaños útiles: **375 × 812** (iPhone clásico), **390 × 844** (iPhone 14/15), **360 × 800** (Android común).

### Diferencias conocidas entre la web y el celular

- **`SafeAreaView` en web (corregido el 6 oct 2026).** El `SafeAreaView` de `react-native-safe-area-context` emite
  `padding: 0` explícito en web y pisaba las clases de Tailwind (`px-6` medía `0px` en el login: los campos tocaban los
  bordes). Ahora todas las pantallas importan `SafeAreaView` desde `components/SafeAreaView`: en el celular es el mismo de
  la librería; en web (`SafeAreaView.web.tsx`) es un `View` plano que respeta el `className`. **En pantallas nuevas,
  importarlo desde ahí y no desde la librería.** No se comprobó si el problema original ocurría también en el celular.
- **Ubicación:** la pantalla de ubicación usa `expo-location`; en web el permiso lo pide el navegador (no verificado).
- **Fuentes:** Baloo 2 y Nunito Sans se sirven desde el propio servidor local (`@expo-google-fonts`), no se descargan de internet.

---

## 4. Verificar un cambio (flujo de trabajo)

1. Editar el código (el servidor recarga solo).
2. Revisar tipos: `npx tsc --noEmit`. El 21 oct 2026 pasa **sin errores**; si aparece alguno, es nuevo.
3. Si el cambio toca las reglas del plan o las recetas: `npm test` (10 pruebas de `scripts/pruebas/plan.test.ts`).
4. Probar en el navegador **con tamaño de celular** (§3), en el flujo completo que toca el cambio.
5. Cambios en la Edge Function: volver a desplegar con
   `npx supabase functions deploy generar-plan --no-verify-jwt` (ver [IA.md](IA.md)). Cambios en `supabase/migrations/`: `npx supabase db push` (§0).
6. Dejar el registro: una entrada nueva arriba en [CHANGELOG.md](CHANGELOG.md) con "Qué" y "Cómo regresar", y commit.

---

## 5. Problemas conocidos de la versión web (y qué hacer)

| Síntoma | Causa | Solución |
|---|---|---|
| La app gira, cae al login y registrar/ingresar falla | Proyecto de Supabase pausado (§0) | Restaurarlo desde el dashboard |
| Se ven elementos duplicados o viejos (por ejemplo una mascota donde no va) tras muchos cambios | Pestaña con caché de hot reload | Cerrar la pestaña por completo y abrirla de nuevo |
| La pantalla "Generando tu plan" no termina de animar en el navegador del panel de Claude Code | La animación no avanza en esa pestaña aunque esté al frente | Probar en un navegador normal o en el celular |
| Un `Pressable` dentro de otro `Pressable` puede no recibir el clic | Problema conocido de la web (no se reprodujo en esta sesión) | Evitarlo: poner los dos como hermanos dentro de un `View`, como se hizo en `app/(plan)/lista-compras.tsx` |
| Un `Alert.alert` con botones no hace nada | En web `Alert` no muestra botones | Hoy el código **no lo usa** (verificado con búsqueda). Si se agrega, dibujar un cuadro propio |
| Un elemento se mueve y arrastra a los demás | Se usó `marginTop`/`marginBottom` | Para mover solo un elemento usar `transform: [{ translateY: n }]`, que no afecta a los vecinos |

### Inicio de sesión automático en desarrollo

En desarrollo (`__DEV__`), `context/AuthContext.tsx` intenta iniciar sesión solo con una cuenta de prueba para no tener
que escribir los datos en cada recarga. Si falla (sin red o proyecto pausado), cae al login normal. En un build de
producción no corre. Las credenciales se leen de `EXPO_PUBLIC_DEV_EMAIL` y `EXPO_PUBLIC_DEV_PASSWORD` en `.env.local`;
si no están, no intenta nada y muestra el login normal. Usar una cuenta solo de pruebas, nunca una personal: las variables
`EXPO_PUBLIC_*` quedan dentro del bundle de desarrollo.

---

## 6. Probar en el emulador de Android (opcional)

```powershell
npm run android        # = expo run:android
```

Necesita Android Studio con un emulador creado y el SDK configurado (`ANDROID_HOME`). Genera un build de **desarrollo**
que se conecta al servidor Metro. Para instalar la app "tal cual", generar el APK de release:
[COMPILACION_APK_ANDROID.md](COMPILACION_APK_ANDROID.md).

---

## 7. Referencia rápida

```powershell
npm install                                   # instalar dependencias
npm run web                                   # servidor web en :8081
npx expo start --web --port 8082              # segundo servidor
npx tsc --noEmit                              # revisar tipos
npm test                                      # pruebas de las reglas del plan
npx supabase projects list                    # ¿el proyecto está ACTIVE?
curl.exe -s -o NUL -w "%{http_code}" http://localhost:8081
```

| Qué | Dónde |
|---|---|
| App en el navegador | http://localhost:8081 |
| Repositorio | https://github.com/EdwardPM05/mikhuna |
| Cambios y cómo regresarlos | [CHANGELOG.md](CHANGELOG.md) |

Si algo no se parece a lo descrito acá, revisar el último cambio en [CHANGELOG.md](CHANGELOG.md).
