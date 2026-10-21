import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { DISTRITOS } from "../../lib/catalogo";

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// El geocodificador pone el distrito en campos distintos según el celular
// (district, subregion o city), así que se prueban todos contra la lista.
function distritoDe(direccion: Location.LocationGeocodedAddress | undefined) {
  if (!direccion) return null;
  const candidatos = [direccion.district, direccion.subregion, direccion.city]
    .filter((c): c is string => !!c)
    .map(normalizar);
  return DISTRITOS.find((d) => candidatos.includes(normalizar(d))) ?? null;
}

export default function UbicacionScreen() {
  const { data, update } = usePlanWizard();
  const [busqueda, setBusqueda] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const [avisoGPS, setAvisoGPS] = useState<string | null>(null);

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return DISTRITOS;
    return DISTRITOS.filter((d) => d.toLowerCase().includes(termino));
  }, [busqueda]);

  async function usarGPS() {
    setSolicitando(true);
    setAvisoGPS(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAvisoGPS("Sin permiso de ubicación no podemos ubicarte. Elige tu distrito de la lista.");
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [direccion] = await Location.reverseGeocodeAsync(posicion.coords);
      const distrito = distritoDe(direccion);
      if (distrito) {
        update({ distrito });
      } else {
        setAvisoGPS("Por ahora solo llegamos a Lima Metropolitana. Elige tu distrito de la lista.");
      }
    } catch {
      // Sin GPS, sin red o en web (donde no hay geocodificación inversa).
      setAvisoGPS("No pudimos detectar tu ubicación. Elige tu distrito de la lista.");
    } finally {
      setSolicitando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 16 }}
      >
        <Image
          source={require("../../src/assets/images/logo_wordmark.png")}
          style={{ width: 170, height: 86, alignSelf: "center", marginBottom: 20 }}
          contentFit="contain"
        />
        <Text className="font-display text-2xl text-ink text-center mb-1">
          ¿Dónde recibes tus pedidos?
        </Text>
        <Text className="font-body text-sm text-ink/70 text-center mb-6">
          Así te mostramos bodegas, mercados y restaurantes afiliados cerca de ti.
        </Text>

        <View className="mb-4">
          <BrandButton
            label={solicitando ? "Buscando tu ubicación..." : "Usar mi ubicación actual"}
            disabled={solicitando}
            onPress={usarGPS}
          />
          {avisoGPS ? (
            <Text className="font-body-semibold text-xs text-maroon text-center mt-2">{avisoGPS}</Text>
          ) : null}
        </View>

        <Text className="font-body text-xs text-ink/50 text-center mb-4">
          o elige tu distrito
        </Text>

        <View className="flex-row items-center border border-ink/15 rounded-2xl px-4 bg-white mb-4">
          <Ionicons name="search" size={18} color="rgba(36,31,33,0.4)" />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar distrito..."
            placeholderTextColor="rgba(36,31,33,0.4)"
            className="flex-1 py-3 pl-2 font-body text-ink"
          />
        </View>

        <View className="flex-row flex-wrap justify-center -mx-1">
          {resultados.length === 0 ? (
            <Text className="font-body text-sm text-ink/50 text-center">
              No llegamos a "{busqueda.trim()}" todavía.
            </Text>
          ) : null}
          {resultados.map((distrito) => {
            const activo = data.distrito === distrito;
            return (
              <View key={distrito} className="px-1 mb-2">
                <Pressable
                  onPress={() => update({ distrito })}
                  accessibilityRole="radio"
                  accessibilityLabel={distrito}
                  accessibilityState={{ checked: activo }}
                  className={`rounded-full py-2.5 px-4 border-2 active:opacity-80 ${
                    activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
                  }`}
                >
                  <Text
                    className={`font-body-bold text-xs ${activo ? "text-cream" : "text-ink"}`}
                  >
                    {distrito}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-6 pb-4">
        <BrandButton
          label="Continuar"
          variant="outline"
          disabled={data.distrito === null}
          onPress={() => router.push("/(onboarding)/modo")}
        />
      </View>
    </SafeAreaView>
  );
}
