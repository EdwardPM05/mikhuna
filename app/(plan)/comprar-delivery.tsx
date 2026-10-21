import { useMemo, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { useCart } from "../../context/CartContext";
import { INGREDIENTES, NEGOCIOS, ofertaElegida } from "../../lib/catalogo";
import { BrandButton } from "../../components/BrandButton";

export default function ComprarDeliveryScreen() {
  const { data } = usePlanWizard();
  const { agregar } = useCart();
  const [tiendaPrincipal, setTiendaPrincipal] = useState<string | null>(null);

  // Solo mostramos negocios que de verdad venden algo de esta lista.
  const negociosConAlgo = useMemo(() => {
    const ids = new Set(INGREDIENTES.flatMap((i) => i.ofertas.map((o) => o.negocioId)));
    return NEGOCIOS.filter((n) => ids.has(n.id));
  }, []);

  const reparto = useMemo(() => {
    if (!tiendaPrincipal) return null;

    const principal: { ingrediente: (typeof INGREDIENTES)[number]; precio: number }[] = [];
    const restoPorNegocio = new Map<
      string,
      { ingrediente: (typeof INGREDIENTES)[number]; precio: number }[]
    >();

    for (const ingrediente of INGREDIENTES) {
      const enPrincipal = ingrediente.ofertas.find((o) => o.negocioId === tiendaPrincipal);
      if (enPrincipal) {
        principal.push({ ingrediente, precio: enPrincipal.precio });
        continue;
      }
      const oferta = ofertaElegida(ingrediente, data.preferenciasCompra);
      const lista = restoPorNegocio.get(oferta.negocioId) ?? [];
      lista.push({ ingrediente, precio: oferta.precio });
      restoPorNegocio.set(oferta.negocioId, lista);
    }

    const grupoPrincipal = {
      negocio: NEGOCIOS.find((n) => n.id === tiendaPrincipal)!,
      items: principal,
    };
    const gruposResto = Array.from(restoPorNegocio.entries()).map(([negocioId, items]) => ({
      negocio: NEGOCIOS.find((n) => n.id === negocioId)!,
      items,
    }));

    return { grupoPrincipal, gruposResto };
  }, [tiendaPrincipal, data.preferenciasCompra]);

  function pedirGrupo(grupo: { negocio: (typeof NEGOCIOS)[number]; items: { ingrediente: (typeof INGREDIENTES)[number]; precio: number }[] }) {
    grupo.items.forEach((it) =>
      agregar(grupo.negocio.id, { id: it.ingrediente.id, nombre: it.ingrediente.nombre, precio: it.precio })
    );
    router.push("/(delivery)/carrito");
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-6 pt-2 pb-2">
        <Pressable
          onPress={() => (tiendaPrincipal ? setTiendaPrincipal(null) : router.back())}
          hitSlop={10}
          className="mr-3 active:opacity-60"
        >
          <Ionicons name={tiendaPrincipal ? "arrow-back" : "arrow-back"} size={24} color="#241F21" />
        </Pressable>
        <Text className="font-display-bold text-lg text-ink">Pedir por delivery</Text>
      </View>

      {!tiendaPrincipal ? (
        <>
          <Text className="font-body text-sm text-ink/60 px-6 mb-4">
            Elige tu tienda de siempre — pedimos ahí lo que vendan, y armamos otro pedido aparte
            solo con lo que les falte.
          </Text>
          <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
            {negociosConAlgo.map((negocio) => (
              <Pressable
                key={negocio.id}
                onPress={() => setTiendaPrincipal(negocio.id)}
                className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-ink/10 active:opacity-80"
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: negocio.color }}
                >
                  <Text className="font-display-bold text-cream text-sm">{negocio.inicial}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-body-extrabold text-ink text-sm">{negocio.nombre}</Text>
                  <Text className="font-body text-xs text-ink/50">{negocio.tipo}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.3)" />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : (
        reparto && (
          <>
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
              <View className="mb-6">
                <Text className="font-body-extrabold text-sm text-ink mb-2">
                  {reparto.grupoPrincipal.negocio.nombre}{" "}
                  <Text className="text-ink/40 font-body">(tu tienda)</Text>
                </Text>
                {reparto.grupoPrincipal.items.length === 0 ? (
                  <Text className="font-body text-xs text-ink/50 mb-3">
                    No vende ninguno de tus ingredientes.
                  </Text>
                ) : (
                  reparto.grupoPrincipal.items.map(({ ingrediente, precio }) => (
                    <View key={ingrediente.id} className="flex-row items-center bg-white rounded-2xl p-3 mb-2 border border-ink/10">
                      <Image source={ingrediente.icono} style={{ width: 28, height: 28, marginRight: 10 }} contentFit="contain" />
                      <Text className="font-body-extrabold text-sm text-ink flex-1">{ingrediente.nombre}</Text>
                      <Text className="font-display-bold text-sm text-chili">S/ {precio.toFixed(2)}</Text>
                    </View>
                  ))
                )}
                {reparto.grupoPrincipal.items.length > 0 && (
                  <BrandButton
                    label={`Pedir de ${reparto.grupoPrincipal.negocio.nombre} (${reparto.grupoPrincipal.items.length}) · S/ ${reparto.grupoPrincipal.items.reduce((s, it) => s + it.precio, 0).toFixed(2)}`}
                    onPress={() => pedirGrupo(reparto.grupoPrincipal)}
                  />
                )}
              </View>

              {reparto.gruposResto.length > 0 && (
                <View>
                  <Text className="font-body-semibold text-xs text-ink/50 mb-3">
                    {reparto.grupoPrincipal.negocio.nombre} no vende esto — te lo traemos de otra
                    tienda:
                  </Text>
                  {reparto.gruposResto.map((grupo) => (
                    <View key={grupo.negocio.id} className="mb-4">
                      <Text className="font-body-extrabold text-sm text-ink mb-2">
                        {grupo.negocio.nombre}
                      </Text>
                      {grupo.items.map(({ ingrediente, precio }) => (
                        <View key={ingrediente.id} className="flex-row items-center bg-white rounded-2xl p-3 mb-2 border border-ink/10">
                          <Image source={ingrediente.icono} style={{ width: 28, height: 28, marginRight: 10 }} contentFit="contain" />
                          <Text className="font-body-extrabold text-sm text-ink flex-1">{ingrediente.nombre}</Text>
                          <Text className="font-display-bold text-sm text-chili">S/ {precio.toFixed(2)}</Text>
                        </View>
                      ))}
                      <BrandButton
                        variant="outline"
                        label={`Pedir de ${grupo.negocio.nombre} (${grupo.items.length}) · S/ ${grupo.items.reduce((s, it) => s + it.precio, 0).toFixed(2)}`}
                        onPress={() => pedirGrupo(grupo)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View className="px-6 pb-4 pt-2">
              <Pressable onPress={() => setTiendaPrincipal(null)} className="active:opacity-60">
                <Text className="font-body-bold text-xs text-chili text-center">Cambiar tienda</Text>
              </Pressable>
            </View>
          </>
        )
      )}
    </SafeAreaView>
  );
}
