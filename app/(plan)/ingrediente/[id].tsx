import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../../components/SafeAreaView";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlanWizard } from "../../../context/PlanWizardContext";
import { INGREDIENTES, NEGOCIOS, ofertaElegida } from "../../../lib/catalogo";

export default function IngredienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, toggle, elegirNegocioParaIngrediente } = usePlanWizard();

  const ingrediente = INGREDIENTES.find((i) => i.id === id);
  const enCarrito = Object.keys(data.preferenciasCompra).length;

  if (!ingrediente) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center px-6">
        <Text className="font-body text-ink/60">Ingrediente no encontrado.</Text>
      </SafeAreaView>
    );
  }

  const marcado = data.comprados.includes(ingrediente.id);
  const ofertas = [...ingrediente.ofertas].sort((a, b) => a.precio - b.precio);
  const masBarata = ofertas[0];
  const yaAsignado = data.preferenciasCompra[ingrediente.id];
  const elegida = ofertaElegida(ingrediente, data.preferenciasCompra);

  function marcarComprado() {
    if (!marcado) toggle("comprados", ingrediente!.id);
    router.back();
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
        <Image source={ingrediente.icono} style={{ width: 36, height: 36, marginRight: 10 }} contentFit="contain" />
        <Text className="font-display-bold text-lg text-ink flex-1">{ingrediente.nombre}</Text>

        <Pressable
          onPress={() => router.push("/(plan)/carrito-ingredientes")}
          hitSlop={8}
          className="active:opacity-60"
        >
          <View>
            <Ionicons name="cart-outline" size={26} color="#241F21" />
            {enCarrito > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-chili rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-cream text-[9px] font-body-extrabold">{enCarrito}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <Text className="font-body text-sm text-ink/60 px-6 mb-4">
        Toca una tienda para agregarla a tu carrito — puedes seguir revisando otros ingredientes
        antes de pedir.
      </Text>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        {ofertas.map((oferta) => {
          const negocio = NEGOCIOS.find((n) => n.id === oferta.negocioId);
          if (!negocio) return null;
          const esMasBarata = oferta.negocioId === masBarata.negocioId;
          const esElegida = oferta.negocioId === elegida.negocioId && !!yaAsignado;

          return (
            <Pressable
              key={oferta.negocioId}
              onPress={() => elegirNegocioParaIngrediente(ingrediente.id, oferta.negocioId)}
              className={`bg-white rounded-2xl p-4 mb-3 border-2 active:opacity-80 ${
                esElegida ? "border-chili" : "border-ink/10"
              }`}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: negocio.color }}
                >
                  <Text className="font-display-bold text-cream text-xs">{negocio.inicial}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-body-extrabold text-ink text-sm">{negocio.nombre}</Text>
                  <Text className="font-body text-xs text-ink/50">
                    {negocio.tiempoEntregaMin} min de delivery
                  </Text>
                </View>
                <View className="items-end mr-3">
                  <Text className="font-display-bold text-chili text-base">
                    S/ {oferta.precio.toFixed(2)}
                  </Text>
                  <Text className="font-body text-[11px] text-ink/40">{oferta.unidad}</Text>
                </View>
                {esElegida ? (
                  <Ionicons name="checkmark-circle" size={24} color="#E5131B" />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color="rgba(36,31,33,0.3)" />
                )}
              </View>

              <View className="flex-row">
                {esMasBarata && (
                  <View className="bg-peach rounded-full px-2 py-0.5 mr-2">
                    <Text className="font-body-bold text-[10px] text-maroon">Más barato</Text>
                  </View>
                )}
                {esElegida && (
                  <View className="bg-chili/10 rounded-full px-2 py-0.5">
                    <Text className="font-body-bold text-[10px] text-chili">En tu carrito</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="px-6 pb-4 pt-2 border-t border-ink/10">
        <Pressable
          onPress={marcarComprado}
          className="flex-row items-center justify-center py-3 active:opacity-70"
        >
          <Ionicons
            name={marcado ? "checkmark-circle" : "checkmark-circle-outline"}
            size={18}
            color="#7A1220"
          />
          <Text className="font-body-extrabold text-sm text-maroon ml-2">
            {marcado ? "Ya está marcado como comprado" : "Voy a comprarlo yo"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
