import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { INGREDIENTES, NEGOCIOS, ofertaElegida } from "../../lib/catalogo";

export default function ComprarYoMismoScreen() {
  const { data, toggle } = usePlanWizard();
  const totalComprados = INGREDIENTES.filter((i) => data.comprados.includes(i.id)).length;
  const enCarrito = Object.keys(data.preferenciasCompra).length;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-6 pt-2 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-3 active:opacity-60">
          <Ionicons name="arrow-back" size={24} color="#241F21" />
        </Pressable>
        <Text className="font-display-bold text-lg text-ink flex-1">Voy a comprarlo yo</Text>
        <Pressable
          onPress={() => router.push("/(plan)/carrito-ingredientes")}
          hitSlop={8}
          className="active:opacity-60"
        >
          <View>
            <Ionicons name="cart-outline" size={24} color="#241F21" />
            {enCarrito > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-chili rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-cream text-[9px] font-body-extrabold">{enCarrito}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <View className="px-6 mb-3">
        <Text className="font-body-semibold text-xs text-ink/60">
          {totalComprados} / {INGREDIENTES.length} listos · toca uno para comparar precios
        </Text>
        <View className="h-1.5 bg-ink/10 rounded-full overflow-hidden mt-1.5">
          <View
            className="h-full bg-chili rounded-full"
            style={{ width: `${(totalComprados / INGREDIENTES.length) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        {INGREDIENTES.map((ingrediente) => {
          const marcado = data.comprados.includes(ingrediente.id);
          const oferta = ofertaElegida(ingrediente, data.preferenciasCompra);
          const negocioOferta = NEGOCIOS.find((n) => n.id === oferta.negocioId);
          const multiplesOfertas = ingrediente.ofertas.length > 1;

          return (
            <View
              key={ingrediente.id}
              className="flex-row items-center bg-white rounded-2xl p-3 mb-2.5 border border-ink/10"
            >
              <Pressable
                onPress={() => toggle("comprados", ingrediente.id)}
                hitSlop={8}
                className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 active:opacity-70 ${
                  marcado ? "bg-chili border-chili" : "border-ink/20"
                }`}
              >
                {marcado && <Ionicons name="checkmark" size={15} color="#FDF3E7" />}
              </Pressable>

              <Pressable
                onPress={() => router.push(`/(plan)/ingrediente/${ingrediente.id}`)}
                className="flex-1 flex-row items-center active:opacity-60"
              >
                <Image
                  source={ingrediente.icono}
                  style={{ width: 32, height: 32, marginRight: 10, opacity: marcado ? 0.4 : 1 }}
                  contentFit="contain"
                />
                <View className="flex-1">
                  <Text
                    className={`font-body-extrabold text-sm ${
                      marcado ? "text-ink/40 line-through" : "text-ink"
                    }`}
                  >
                    {ingrediente.nombre}
                  </Text>
                  <Text className="font-body text-xs text-ink/45">
                    {multiplesOfertas ? `${ingrediente.ofertas.length} negocios` : "1 negocio"} · S/{" "}
                    {oferta.precio.toFixed(2)} en {negocioOferta?.nombre}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.3)" />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
