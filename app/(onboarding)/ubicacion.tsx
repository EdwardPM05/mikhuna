import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { DISTRITOS } from "../../lib/catalogo";

export default function UbicacionScreen() {
  const { data, update } = usePlanWizard();
  const [busqueda, setBusqueda] = useState("");
  const [solicitando, setSolicitando] = useState(false);

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return DISTRITOS;
    return DISTRITOS.filter((d) => d.toLowerCase().includes(termino));
  }, [busqueda]);

  async function usarGPS() {
    setSolicitando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        router.push("/(onboarding)/mapa");
      }
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
            label={solicitando ? "Solicitando..." : "Usar mi ubicación actual"}
            onPress={usarGPS}
          />
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
          {resultados.slice(0, 12).map((distrito) => {
            const activo = data.distrito === distrito;
            return (
              <View key={distrito} className="px-1 mb-2">
                <Pressable
                  onPress={() => update({ distrito })}
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
