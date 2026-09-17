import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIAS_EXPLORAR, NEGOCIOS } from "../../lib/catalogo";

export default function ExplorarScreen() {
  const [categoria, setCategoria] = useState<string | null>(null);

  const negocios = useMemo(() => {
    if (!categoria) return NEGOCIOS;
    return NEGOCIOS.filter((n) => n.categorias.includes(categoria));
  }, [categoria]);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center justify-between px-6 pt-4 mb-4">
        <Text className="font-display-bold text-xl text-ink">Explorar</Text>
        <Image
          source={require("../../src/assets/mascots/choclito.png")}
          style={{ width: 36, height: 36 }}
          contentFit="contain"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        className="pl-6 mb-4"
        contentContainerStyle={{ paddingRight: 24, alignItems: "center" }}
      >
        {CATEGORIAS_EXPLORAR.map((cat) => {
          const activo = categoria === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategoria(activo ? null : cat.id)}
              className={`flex-row items-center rounded-full py-2.5 px-4 mr-2 border-2 active:opacity-80 ${
                activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
              }`}
            >
              <Text className="text-base mr-1.5">{cat.emoji}</Text>
              <Text className={`font-body-bold text-xs ${activo ? "text-cream" : "text-ink"}`}>
                {cat.nombre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        {negocios.map((negocio) => (
          <Pressable
            key={negocio.id}
            onPress={() => router.push(`/(delivery)/negocio/${negocio.id}`)}
            className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-ink/10 active:opacity-80"
          >
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: negocio.color }}
            >
              <Text className="font-display-bold text-cream text-base">{negocio.inicial}</Text>
            </View>

            <View className="flex-1 ml-3">
              <Text className="font-body-extrabold text-ink text-base mb-0.5">{negocio.nombre}</Text>
              <View className="flex-row items-center">
                <Ionicons name="star" size={12} color="#F7941D" />
                <Text className="font-body-semibold text-xs text-ink/70 ml-1 mr-2">
                  {negocio.calificacion}
                </Text>
                <Ionicons name="time-outline" size={12} color="rgba(36,31,33,0.5)" />
                <Text className="font-body text-xs text-ink/50 ml-1">
                  {negocio.tiempoEntregaMin} min
                </Text>
              </View>
              {negocio.deBarrio && (
                <View className="self-start bg-peach rounded-full px-2 py-0.5 mt-1.5">
                  <Text className="font-body-bold text-[10px] text-maroon">Negocio de barrio</Text>
                </View>
              )}
            </View>

            <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.3)" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
