import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ListaComprasScreen() {
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(36,31,33,0.55)" }}>
      <Pressable onPress={() => router.back()} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />

      <View className="w-full bg-cream rounded-3xl p-5">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="absolute top-4 right-4 z-10 active:opacity-60"
        >
          <Ionicons name="close" size={22} color="#241F21" />
        </Pressable>

        <Text className="font-display text-lg text-ink text-center mb-5 pr-6">
          ¿Cómo quieres conseguir tus ingredientes?
        </Text>

        <Pressable
          onPress={() => router.push("/(plan)/comprar-delivery")}
          className="bg-white border-2 border-ink/10 rounded-2xl p-4 flex-row items-center mb-3 active:opacity-80"
        >
          <View className="w-12 h-12 rounded-xl bg-chili items-center justify-center mr-3">
            <Ionicons name="bicycle-outline" size={22} color="#FDF3E7" />
          </View>
          <Text className="font-display-bold text-sm text-ink flex-1">Pedir por delivery</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(plan)/comprar-yo-mismo")}
          className="bg-white border-2 border-ink/10 rounded-2xl p-4 flex-row items-center active:opacity-80"
        >
          <View className="w-12 h-12 rounded-xl bg-peach items-center justify-center mr-3">
            <Ionicons name="walk-outline" size={22} color="#7A1220" />
          </View>
          <Text className="font-display-bold text-sm text-ink flex-1">Voy a comprarlo yo</Text>
        </Pressable>
      </View>
    </View>
  );
}
