import { useMemo, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { useCart } from "../../context/CartContext";
import { INGREDIENTES, NEGOCIOS } from "../../lib/catalogo";
import { BrandButton } from "../../components/BrandButton";

export default function CarritoIngredientesScreen() {
  const { data, quitarDeCarrito } = usePlanWizard();
  const { agregar } = useCart();
  const [busqueda, setBusqueda] = useState("");

  const grupos = useMemo(() => {
    const porNegocio = new Map<
      string,
      { ingrediente: (typeof INGREDIENTES)[number]; precio: number }[]
    >();
    for (const [ingredienteId, negocioId] of Object.entries(data.preferenciasCompra)) {
      const ingrediente = INGREDIENTES.find((i) => i.id === ingredienteId);
      const oferta = ingrediente?.ofertas.find((o) => o.negocioId === negocioId);
      if (!ingrediente || !oferta) continue;
      const lista = porNegocio.get(negocioId) ?? [];
      lista.push({ ingrediente, precio: oferta.precio });
      porNegocio.set(negocioId, lista);
    }
    return Array.from(porNegocio.entries())
      .map(([negocioId, items]) => ({ negocio: NEGOCIOS.find((n) => n.id === negocioId)!, items }))
      .filter((g) => g.negocio)
      .filter((g) =>
        busqueda.trim() ? g.negocio.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) : true
      );
  }, [data.preferenciasCompra, busqueda]);

  const totalItems = Object.keys(data.preferenciasCompra).length;

  function pedirGrupo(grupo: (typeof grupos)[number]) {
    grupo.items.forEach((it) =>
      agregar(grupo.negocio.id, { id: it.ingrediente.id, nombre: it.ingrediente.nombre, precio: it.precio })
    );
    router.push("/(delivery)/carrito");
  }

  if (totalItems === 0) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 items-center justify-center">
        <Ionicons name="cart-outline" size={40} color="rgba(36,31,33,0.25)" />
        <Text className="font-display text-xl text-ink text-center mt-4 mb-2">
          Tu carrito está vacío
        </Text>
        <Text className="font-body text-ink/60 text-center mb-6">
          Entra a un ingrediente y elige en qué tienda quieres comprarlo.
        </Text>
        <BrandButton label="Volver a la lista" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-6 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-3 active:opacity-60">
          <Ionicons name="arrow-back" size={24} color="#241F21" />
        </Pressable>
        <Text className="font-display-bold text-lg text-ink">Carrito · {totalItems} items</Text>
      </View>

      <View className="flex-row items-center border border-ink/15 rounded-2xl px-4 bg-white mx-6 mb-4">
        <Ionicons name="search" size={16} color="rgba(36,31,33,0.4)" />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar tienda..."
          placeholderTextColor="rgba(36,31,33,0.4)"
          className="flex-1 py-2.5 pl-2 font-body text-ink text-sm"
        />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        {grupos.length === 0 ? (
          <Text className="font-body text-ink/50 text-center mt-6">
            Ninguna tienda coincide con "{busqueda}".
          </Text>
        ) : (
          grupos.map((grupo) => {
            const subtotal = grupo.items.reduce((s, it) => s + it.precio, 0);
            return (
              <View key={grupo.negocio.id} className="mb-6">
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                    style={{ backgroundColor: grupo.negocio.color }}
                  >
                    <Text className="font-display-bold text-cream text-[10px]">
                      {grupo.negocio.inicial}
                    </Text>
                  </View>
                  <Text className="font-body-extrabold text-sm text-ink flex-1">
                    {grupo.negocio.nombre}
                  </Text>
                  <Text className="font-body text-xs text-ink/50">{grupo.items.length} items</Text>
                </View>

                {grupo.items.map(({ ingrediente, precio }) => (
                  <View
                    key={ingrediente.id}
                    className="flex-row items-center bg-white rounded-2xl p-3 mb-2 border border-ink/10"
                  >
                    <Image source={ingrediente.icono} style={{ width: 28, height: 28, marginRight: 10 }} contentFit="contain" />
                    <Text className="font-body-extrabold text-sm text-ink flex-1">
                      {ingrediente.nombre}
                    </Text>
                    <Text className="font-display-bold text-sm text-chili mr-3">
                      S/ {precio.toFixed(2)}
                    </Text>
                    <Pressable onPress={() => quitarDeCarrito(ingrediente.id)} hitSlop={8} className="active:opacity-60">
                      <Ionicons name="close-circle" size={20} color="rgba(36,31,33,0.3)" />
                    </Pressable>
                  </View>
                ))}

                <BrandButton
                  label={`Pedir de ${grupo.negocio.nombre} · S/ ${subtotal.toFixed(2)}`}
                  onPress={() => pedirGrupo(grupo)}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
