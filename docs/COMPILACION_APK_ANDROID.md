# Compilación del APK Android — Mikhuna (Windows)

> Adaptado de la guía equivalente de NovaSmart (`C:\nova\COMPILACION_APK_ANDROID.md`).
> Build **siempre local** para este proyecto — no usar EAS Build en la nube salvo
> que se decida lo contrario explícitamente.

---

## 0. El proyecto es "bare workflow"

Desde que se corrió `npx expo prebuild --platform android`, `android/` es un
proyecto Android nativo real con Gradle — no se regenera solo. Si se cambia un
ícono/splash/nombre en `app.json`, hay que volver a correr
`npx expo prebuild --clean` para que se refleje en `android/`.

## 1. Las 3 formas de compilar, y cuándo usar cada una

| Método | Comando | Qué genera | Cuándo usarlo |
|---|---|---|---|
| **Debug local** | `cd android && ./gradlew assembleDebug` | APK que necesita `npx expo start` corriendo (Metro) para funcionar. | Iterar rápido con hot reload durante desarrollo. |
| **Release local** | `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` | APK standalone, JS empaquetado adentro, no necesita PC prendida. | Probar el build real en el celular, mandarlo a alguien. |
| ~~EAS Build (nube)~~ | — | — | No usar para este proyecto por ahora — build siempre local. |

## 2. Antes de compilar (una vez por PC)

**Keystore de debug.** `android/app/build.gradle` firma también el release con
`android/app/debug.keystore`, que no viaja por git (`*.keystore` está en
`.gitignore`). Si no existe, copiar el que genera Android Studio:

```bash
cp ~/.android/debug.keystore android/app/debug.keystore
```

**SDK de Android.** Gradle necesita `ANDROID_HOME` apuntando al SDK:

```bash
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
```

## 3. Reducir el tamaño del APK: arquitecturas de CPU

Por defecto `android/gradle.properties` empaqueta las 4 arquitecturas
(`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`). Casi cualquier celular real
actual es `arm64-v8a`; las otras son para equipos viejos o emuladores. Se puede
limitar por build sin tocar ningún archivo, con `-PreactNativeArchitectures`:

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## 4. Comandos de referencia (copiar/pegar)

Release liviano, solo `arm64-v8a`:

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --stacktrace
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

Debug (necesita `npx expo start` corriendo):

```bash
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Limpiar cachés nativas si algo se comporta raro:

```bash
rm -rf android/app/.cxx android/app/build android/build android/.gradle
```

Si es específicamente un asset/imagen desactualizado, limpiar también Metro:

```bash
rm -rf "$TEMP/metro-cache" "$TEMP"/haste-map-* .expo
```

## 5. Qué lleva el APK release

- **Sin credenciales de desarrollo.** `EXPO_PUBLIC_DEV_EMAIL` y `EXPO_PUBLIC_DEV_PASSWORD`
  solo se usan dentro de un `__DEV__ ?` en `context/AuthContext.tsx`, así que el
  build de release no las incluye. Comprobado: el bundle `assets/index.android.bundle`
  del APK compilado el 21 oct 2026 (01:56) no contiene los valores de esas variables.
- **Sin respaldo automático de datos.** `allowBackup` está en `false` en `app.json`
  (`android.allowBackup`) y en `android/app/src/main/AndroidManifest.xml`.
- **Sí lleva** `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`: son
  públicas por diseño (la clave `anon`). La clave de Gemini no está en el APK.

## 6. Instalar sobre un build anterior con distinta firma

Mientras no haya keystore de producción propio, `assembleRelease` firma con
`android/app/debug.keystore` (contraseña `android`, alias `androiddebugkey`,
definidos en `signingConfigs.debug` de `android/app/build.gradle`). Sirve para
probar en el celular, pero **no** para distribuir de verdad — ver §7. Si Android
se queja de "conflicto de firma" al instalar sobre una versión vieja, desinstalar
el APK anterior primero.

## 7. Pendiente antes de distribuir de verdad (no bloquea pruebas)

- [ ] Generar un keystore de producción propio para Mikhuna (nunca reusar el
      de NovaSmart) cuando se vaya a repartir la app fuera de pruebas internas:
      ```bash
      keytool -genkeypair -v -keystore android/app/mikhuna-release.jks -alias mikhuna -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Mikhuna, OU=Mikhuna, O=Mikhuna, L=Lima, S=Lima, C=PE"
      ```
  - Guardar `android/app/mikhuna-release.jks` + `android/keystore.properties`
    fuera de esta PC (backup). Si se pierde, no hay forma de publicar updates
    sobre una versión ya instalada con esa firma.
- [ ] Configurar `signingConfigs.release` en `android/app/build.gradle` para
      leer ese keystore (hoy `buildTypes.release` usa `signingConfigs.debug`).
      Igual patrón que NovaSmart §10 de su guía.
- [ ] Considerar fijar `reactNativeArchitectures=arm64-v8a` en
      `android/gradle.properties` si todos los builds van a ser solo para
      celulares modernos (hoy trae las 4).
