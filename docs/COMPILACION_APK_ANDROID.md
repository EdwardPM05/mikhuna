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
| **Release local** | `cd android && ./gradlew assembleRelease` | APK standalone, JS empaquetado adentro, no necesita PC prendida. | Probar el build real en el celular, mandarlo a alguien. |
| ~~EAS Build (nube)~~ | — | — | No usar para este proyecto por ahora — build siempre local. |

## 2. Reducir el tamaño del APK: arquitecturas de CPU

Por defecto se empaquetan las 4 arquitecturas (`arm64-v8a`, `armeabi-v7a`,
`x86`, `x86_64`). Casi cualquier celular real actual es `arm64-v8a`; las otras
son para equipos viejos o emuladores. Se puede limitar por build sin tocar
ningún archivo:

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## 3. Comandos de referencia (copiar/pegar)

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

## 4. Instalar sobre un build anterior con distinta firma

Mientras no haya keystore de producción propio, `assembleRelease` firma con el
`debug.keystore` por defecto (contraseña `android`, alias `androiddebugkey`).
Sirve para probar en el celular, pero **no** para distribuir de verdad — ver
§5. Si Android se queja de "conflicto de firma" al instalar sobre una versión
vieja, desinstalar el APK anterior primero.

## 5. Pendiente antes de distribuir de verdad (no bloquea pruebas)

- [ ] Generar un keystore de producción propio para Mikhuna (nunca reusar el
      de NovaSmart) cuando se vaya a repartir la app fuera de pruebas internas:
      ```bash
      keytool -genkeypair -v -keystore android/app/mikhuna-release.jks -alias mikhuna -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Mikhuna, OU=Mikhuna, O=Mikhuna, L=Lima, S=Lima, C=PE"
      ```
  - Guardar `android/app/mikhuna-release.jks` + `android/keystore.properties`
    fuera de esta PC (backup). Si se pierde, no hay forma de publicar updates
    sobre una versión ya instalada con esa firma.
- [ ] Configurar `signingConfigs.release` en `android/app/build.gradle` para
      leer ese keystore (igual patrón que NovaSmart §10 de su guía).
- [ ] Considerar fijar `reactNativeArchitectures=arm64-v8a` en
      `android/gradle.properties` si todos los builds van a ser solo para
      celulares modernos.
