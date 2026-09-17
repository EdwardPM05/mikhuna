import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function PedidosScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream px-6 pt-4">
      <Text className="font-display-bold text-xl text-ink mb-6">Pedidos</Text>

      <Pressable
        onPress={() => router.push("/(delivery)/seguimiento")}
        className="flex-row items-center bg-white rounded-2xl p-4 border border-ink/10 active:opacity-80"
      >
        <View className="w-11 h-11 rounded-xl bg-chili items-center justify-center mr-3">
          <Ionicons name="bicycle-outline" size={22} color="#FDF3E7" />
        </View>
        <View className="flex-1">
          <Text className="font-body-extrabold text-ink text-sm">Pedido de prueba en curso</Text>
          <Text className="font-body text-xs text-ink/50">Toca para ver el seguimiento</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.3)" />
      </Pressable>

      <Text className="font-body text-ink/40 text-xs mt-6">
        El historial real de pedidos se conecta más adelante con Supabase.
      </Text>
    </SafeAreaView>
  );
}
