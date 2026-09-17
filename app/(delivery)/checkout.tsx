import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import { BrandButton } from "../../components/BrandButton";

const PROPINAS = [0, 3, 5, 8];
const METODOS = [
  { id: "efectivo", nombre: "Efectivo", icono: "cash-outline" as const },
  { id: "yape", nombre: "Yape / Plin", icono: "phone-portrait-outline" as const },
  { id: "tarjeta", nombre: "Tarjeta", icono: "card-outline" as const },
];

export default function CheckoutScreen() {
  const { total, vaciar } = useCart();
  const [direccion, setDireccion] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [propina, setPropina] = useState(3);
  const [nota, setNota] = useState("");

  const totalConPropina = total + propina;

  function confirmarPedido() {
    vaciar();
    router.replace("/(delivery)/seguimiento");
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-3 active:opacity-60">
          <Ionicons name="arrow-back" size={24} color="#241F21" />
        </Pressable>
        <Text className="font-display-bold text-lg text-ink">Confirmar pedido</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="font-body-bold text-sm text-ink mb-2">Dirección de entrega</Text>
        <TextInput
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Calle, número, referencia..."
          placeholderTextColor="rgba(36,31,33,0.4)"
          className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-5"
        />

        <Text className="font-body-bold text-sm text-ink mb-2">Método de pago</Text>
        <View className="mb-5">
          {METODOS.map((m) => {
            const activo = metodo === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMetodo(m.id)}
                className={`flex-row items-center rounded-2xl p-3.5 mb-2 border-2 active:opacity-80 ${
                  activo ? "border-chili bg-chili/5" : "border-ink/10 bg-white"
                }`}
              >
                <Ionicons name={m.icono} size={20} color={activo ? "#E5131B" : "#241F21"} />
                <Text
                  className={`font-body-bold text-sm ml-3 flex-1 ${activo ? "text-chili" : "text-ink"}`}
                >
                  {m.nombre}
                </Text>
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    activo ? "border-chili bg-chili" : "border-ink/20"
                  }`}
                >
                  {activo && <View className="w-2 h-2 rounded-full bg-cream" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text className="font-body-bold text-sm text-ink mb-2">Propina para el repartidor</Text>
        <View className="flex-row -mx-1 mb-5">
          {PROPINAS.map((p) => {
            const activo = propina === p;
            return (
              <View key={p} className="flex-1 px-1">
                <Pressable
                  onPress={() => setPropina(p)}
                  className={`rounded-xl py-2.5 items-center border-2 active:opacity-80 ${
                    activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
                  }`}
                >
                  <Text className={`font-body-extrabold text-xs ${activo ? "text-cream" : "text-ink"}`}>
                    {p === 0 ? "Sin propina" : `S/ ${p}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text className="font-body-bold text-sm text-ink mb-2">Nota para el negocio (opcional)</Text>
        <TextInput
          value={nota}
          onChangeText={setNota}
          placeholder="Ej: tocar el timbre, sin ají..."
          placeholderTextColor="rgba(36,31,33,0.4)"
          multiline
          className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-2"
          style={{ minHeight: 70, textAlignVertical: "top" }}
        />
      </ScrollView>

      <View className="px-6 pb-4 pt-2 border-t border-ink/10">
        <View className="flex-row justify-between mb-3">
          <Text className="font-body-semibold text-ink/70">Total a pagar</Text>
          <Text className="font-display-bold text-ink text-lg">S/ {totalConPropina.toFixed(2)}</Text>
        </View>
        <BrandButton
          label="Confirmar pedido"
          disabled={direccion.trim().length === 0}
          onPress={confirmarPedido}
        />
      </View>
    </SafeAreaView>
  );
}
