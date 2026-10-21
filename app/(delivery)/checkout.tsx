import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrdersContext";
import { NEGOCIOS } from "../../lib/catalogo";
import { BrandButton } from "../../components/BrandButton";

const PROPINAS = [0, 3, 5, 8];
const METODOS = [
  { id: "efectivo", nombre: "Efectivo", icono: "cash-outline" as const },
  { id: "yape", nombre: "Yape / Plin", icono: "phone-portrait-outline" as const },
  { id: "tarjeta", nombre: "Tarjeta", icono: "card-outline" as const },
];

export default function CheckoutScreen() {
  const { negocioId, items, total, vaciar } = useCart();
  const { crear } = useOrders();
  const [direccion, setDireccion] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [propina, setPropina] = useState(3);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const negocio = NEGOCIOS.find((n) => n.id === negocioId);
  const totalConPropina = total + propina;
  const faltaDireccion = direccion.trim().length === 0;
  // El carrito ya lo exige, pero aquí se puede llegar de otra forma (volver
  // atrás después de quitar productos, un enlace guardado).
  const faltaParaMinimo = negocio ? Math.max(0, negocio.pedidoMinimo - total) : 0;

  async function confirmarPedido() {
    if (!negocioId || items.length === 0 || enviando || faltaDireccion || faltaParaMinimo > 0) return;
    setEnviando(true);
    setErrorEnvio(null);
    const { id, error } = await crear({
      negocioId,
      items,
      subtotal: total,
      propina,
      total: totalConPropina,
      metodoPago: METODOS.find((m) => m.id === metodo)?.nombre ?? metodo,
      direccion: direccion.trim(),
      nota: nota.trim(),
    });
    setEnviando(false);
    if (error || !id) {
      setErrorEnvio(error);
      return;
    }
    vaciar();
    router.replace({ pathname: "/(delivery)/seguimiento", params: { id } });
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="mr-3 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Atrás"
        >
          <Ionicons name="arrow-back" size={24} color="#241F21" />
        </Pressable>
        <Text className="font-display-bold text-lg text-ink">Confirmar pedido</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white rounded-3xl p-4 mb-5 border border-ink/10">
          <View className="flex-row items-center mb-3">
            <View
              className="w-9 h-9 rounded-xl items-center justify-center mr-2.5"
              style={{ backgroundColor: negocio?.color ?? "#241F21" }}
            >
              <Text className="font-display-bold text-cream text-xs">{negocio?.inicial ?? "?"}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-body-extrabold text-sm text-ink" numberOfLines={1}>
                {negocio?.nombre ?? "Tu pedido"}
              </Text>
              {negocio ? (
                <Text className="font-body text-xs text-ink/50">Llega en ~{negocio.tiempoEntregaMin} min</Text>
              ) : null}
            </View>
            <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
              <Text className="font-body-bold text-xs text-chili">Editar</Text>
            </Pressable>
          </View>
          {items.map((item) => (
            <View key={item.id} className="flex-row justify-between mb-1">
              <Text className="font-body text-sm text-ink/80 flex-1 mr-2" numberOfLines={1}>
                {item.cantidad} × {item.nombre}
              </Text>
              <Text className="font-body-semibold text-sm text-ink/70">
                S/ {(item.precio * item.cantidad).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <Text className="font-body-bold text-sm text-ink mb-2">Dirección de entrega</Text>
        <TextInput
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Calle, número, referencia..."
          maxLength={300}
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
                accessibilityRole="radio"
                accessibilityLabel={m.nombre}
                accessibilityState={{ checked: activo }}
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
                  accessibilityRole="radio"
                  accessibilityLabel={p === 0 ? "Sin propina" : `Propina de ${p} soles`}
                  accessibilityState={{ checked: activo }}
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
          maxLength={500}
          placeholderTextColor="rgba(36,31,33,0.4)"
          multiline
          className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-2"
          style={{ minHeight: 70, textAlignVertical: "top" }}
        />
      </ScrollView>

      <View className="px-6 pb-4 pt-3 border-t border-ink/10">
        <View className="flex-row justify-between mb-1">
          <Text className="font-body text-sm text-ink/60">Subtotal</Text>
          <Text className="font-body-semibold text-sm text-ink/70">S/ {total.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="font-body text-sm text-ink/60">Propina</Text>
          <Text className="font-body-semibold text-sm text-ink/70">S/ {propina.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="font-body-bold text-ink">Total a pagar</Text>
          <Text className="font-display-bold text-chili text-xl">S/ {totalConPropina.toFixed(2)}</Text>
        </View>
        {faltaParaMinimo > 0 ? (
          <Text className="font-body-semibold text-xs text-maroon text-center mb-2">
            Te faltan S/ {faltaParaMinimo.toFixed(2)} para el pedido mínimo de {negocio?.nombre}.
          </Text>
        ) : faltaDireccion ? (
          <Text className="font-body-semibold text-xs text-maroon text-center mb-2">
            Escribe tu dirección para confirmar el pedido.
          </Text>
        ) : null}
        {errorEnvio ? (
          <View className="flex-row items-start bg-chili/10 rounded-xl px-3 py-2.5 mb-2">
            <Ionicons name="alert-circle" size={16} color="#E5131B" style={{ marginTop: 1 }} />
            <Text className="font-body-semibold text-xs text-maroon ml-2 flex-1">{errorEnvio}</Text>
          </View>
        ) : null}
        <BrandButton
          label={enviando ? "Enviando pedido..." : "Confirmar pedido"}
          disabled={faltaDireccion || faltaParaMinimo > 0 || enviando}
          onPress={confirmarPedido}
        />
      </View>
    </SafeAreaView>
  );
}
