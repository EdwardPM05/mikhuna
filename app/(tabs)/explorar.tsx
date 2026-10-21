import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIAS_EXPLORAR, NEGOCIOS, PRODUCTOS } from "../../lib/catalogo";
import { useCart } from "../../context/CartContext";

export default function ExplorarScreen() {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const { negocioId, cantidadTotal, total } = useCart();
  const negocioCarrito = NEGOCIOS.find((n) => n.id === negocioId);

  // La búsqueda mira el nombre y el tipo del negocio y también lo que vende,
  // para que "pollo" encuentre al mercado que tiene pollo.
  const negocios = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return NEGOCIOS.filter((n) => {
      if (categoria && !n.categorias.includes(categoria)) return false;
      if (!termino) return true;
      if (`${n.nombre} ${n.tipo}`.toLowerCase().includes(termino)) return true;
      return PRODUCTOS.some((p) => p.negocioId === n.id && p.nombre.toLowerCase().includes(termino));
    });
  }, [categoria, busqueda]);

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

      <View className="flex-row items-center bg-white rounded-2xl mx-6 px-4 mb-4 border border-ink/10">
        <Ionicons name="search" size={18} color="rgba(36,31,33,0.4)" />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Busca un negocio o producto"
          placeholderTextColor="rgba(36,31,33,0.4)"
          returnKeyType="search"
          className="flex-1 font-body text-ink py-3 ml-2"
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda("")} hitSlop={8} accessibilityLabel="Borrar búsqueda">
            <Ionicons name="close-circle" size={18} color="rgba(36,31,33,0.35)" />
          </Pressable>
        )}
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
        {negocios.length === 0 && (
          <View className="items-center pt-10 px-4">
            <Image
              source={require("../../src/assets/mascots/choclito.png")}
              style={{ width: 90, height: 90, marginBottom: 12 }}
              contentFit="contain"
            />
            <Text className="font-display-bold text-lg text-ink text-center mb-1">No encontramos nada</Text>
            <Text className="font-body text-sm text-ink/60 text-center mb-4">
              Prueba con otra palabra o quita el filtro.
            </Text>
            <Pressable
              onPress={() => {
                setBusqueda("");
                setCategoria(null);
              }}
              className="bg-peach/60 rounded-full px-4 py-2 active:opacity-70"
            >
              <Text className="font-body-bold text-xs text-maroon">Ver todos los negocios</Text>
            </Pressable>
          </View>
        )}
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
              <Text className="font-body-extrabold text-ink text-base">{negocio.nombre}</Text>
              <Text className="font-body text-xs text-ink/50 mb-0.5">{negocio.tipo}</Text>
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

      {cantidadTotal > 0 && negocioCarrito && (
        <View className="px-6 pb-3 pt-2">
          <Pressable
            onPress={() => router.push("/(delivery)/carrito")}
            className="flex-row items-center bg-chili rounded-2xl px-4 py-3.5 active:opacity-90"
          >
            <View className="bg-cream rounded-full min-w-[26px] h-[26px] px-1.5 items-center justify-center mr-3">
              <Text className="font-body-extrabold text-xs text-chili">{cantidadTotal}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-display-bold text-base text-cream leading-5">Ver carrito</Text>
              <Text className="font-body text-xs text-cream/80" numberOfLines={1}>
                {negocioCarrito.nombre}
              </Text>
            </View>
            <Text className="font-display-bold text-base text-cream">S/ {total.toFixed(2)}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
