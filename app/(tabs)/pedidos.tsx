import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";
import { NEGOCIOS } from "../../lib/catalogo";
import { useCart } from "../../context/CartContext";
import { ORDEN_ESTADOS, useOrders, type EstadoPedido, type Pedido } from "../../context/OrdersContext";

const SOMBRA_SUAVE = {
  shadowColor: "#241F21",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const TITULO_ESTADO: Record<EstadoPedido, string> = {
  confirmado: "Confirmado",
  preparando: "Preparando",
  "en-camino": "En camino",
  entregado: "Entregado",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Formato propio en vez de toLocaleString: Hermes no trae todos los locales.
function fechaCorta(iso: string) {
  const d = new Date(iso);
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hora}`;
}

function resumenItems(pedido: Pedido) {
  return pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(", ");
}

function AvatarNegocio({ negocioId }: { negocioId: string }) {
  const negocio = NEGOCIOS.find((n) => n.id === negocioId);
  return (
    <View
      className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
      style={{ backgroundColor: negocio?.color ?? "#241F21" }}
    >
      <Text className="font-display-bold text-cream text-sm">{negocio?.inicial ?? "?"}</Text>
    </View>
  );
}

function TarjetaEnCurso({ pedido }: { pedido: Pedido }) {
  const negocio = NEGOCIOS.find((n) => n.id === pedido.negocioId);
  const paso = ORDEN_ESTADOS.indexOf(pedido.estado);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(delivery)/seguimiento", params: { id: pedido.id } })}
      className="bg-white rounded-3xl p-4 mb-3 border-2 border-chili/20 active:opacity-80"
      style={SOMBRA_SUAVE}
    >
      <View className="flex-row items-center mb-3">
        <AvatarNegocio negocioId={pedido.negocioId} />
        <View className="flex-1">
          <Text className="font-body-extrabold text-ink text-sm" numberOfLines={1}>
            {negocio?.nombre ?? "Negocio"}
          </Text>
          <Text className="font-body text-xs text-ink/50">{fechaCorta(pedido.creadoEn)}</Text>
        </View>
        <View className="bg-chili rounded-full px-2.5 py-1 flex-row items-center">
          <Ionicons name="bicycle-outline" size={12} color="#FDF3E7" />
          <Text className="font-body-bold text-[10px] text-cream ml-1">{TITULO_ESTADO[pedido.estado]}</Text>
        </View>
      </View>

      <View className="flex-row mb-3" style={{ gap: 4 }}>
        {ORDEN_ESTADOS.map((e, i) => (
          <View key={e} className={`flex-1 h-1.5 rounded-full ${i <= paso ? "bg-chili" : "bg-ink/10"}`} />
        ))}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="font-body-semibold text-xs text-chili">Ver seguimiento</Text>
        <Ionicons name="chevron-forward" size={16} color="#E5131B" />
      </View>
    </Pressable>
  );
}

function TarjetaAnterior({ pedido, onRepetir }: { pedido: Pedido; onRepetir: () => void }) {
  const negocio = NEGOCIOS.find((n) => n.id === pedido.negocioId);
  const estrellas = pedido.calificacion ?? 0;
  return (
    <View className="bg-white rounded-3xl p-4 mb-3 border border-ink/10">
      <View className="flex-row items-center mb-2">
        <AvatarNegocio negocioId={pedido.negocioId} />
        <View className="flex-1">
          <Text className="font-body-extrabold text-ink text-sm" numberOfLines={1}>
            {negocio?.nombre ?? "Negocio"}
          </Text>
          <Text className="font-body text-xs text-ink/50">{fechaCorta(pedido.creadoEn)}</Text>
        </View>
        <Text className="font-display-bold text-base text-ink">S/ {pedido.total.toFixed(2)}</Text>
      </View>

      <Text className="font-body text-xs text-ink/60 mb-3" numberOfLines={2}>
        {resumenItems(pedido)}
      </Text>

      <View className="flex-row items-center justify-between">
        {estrellas > 0 ? (
          <View className="flex-row items-center" accessibilityLabel={`Calificado con ${estrellas} de 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons
                key={n}
                name={n <= estrellas ? "star" : "star-outline"}
                size={14}
                color={n <= estrellas ? "#F7941D" : "rgba(36,31,33,0.25)"}
              />
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push({ pathname: "/(delivery)/calificar", params: { id: pedido.id } })}
            hitSlop={6}
            className="flex-row items-center active:opacity-60"
          >
            <Ionicons name="star-outline" size={14} color="#F7941D" />
            <Text className="font-body-bold text-xs text-mango ml-1">Calificar</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onRepetir}
          className="flex-row items-center bg-peach/60 rounded-full px-3 py-1.5 active:opacity-70"
        >
          <Ionicons name="refresh" size={13} color="#7A1220" />
          <Text className="font-body-bold text-xs text-maroon ml-1">Volver a pedir</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PedidosScreen() {
  const { pedidos, cargando, errorCarga, recargar } = useOrders();
  const { agregar } = useCart();

  const enCurso = pedidos.filter((p) => p.estado !== "entregado");
  const anteriores = pedidos.filter((p) => p.estado === "entregado");

  function repetir(pedido: Pedido) {
    for (const item of pedido.items) {
      for (let i = 0; i < item.cantidad; i++) {
        agregar(pedido.negocioId, { id: item.id, nombre: item.nombre, precio: item.precio });
      }
    }
    router.push("/(delivery)/carrito");
  }

  if (pedidos.length === 0 && cargando) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator color="#E5131B" />
        <Text className="font-body text-sm text-ink/50 mt-3">Cargando tus pedidos...</Text>
      </SafeAreaView>
    );
  }

  if (pedidos.length === 0 && errorCarga) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 items-center justify-center">
        <Ionicons name="cloud-offline-outline" size={48} color="rgba(36,31,33,0.3)" />
        <Text className="font-display text-xl text-ink text-center mt-3 mb-2">Sin conexión</Text>
        <Text className="font-body text-ink/60 text-center mb-6">{errorCarga}</Text>
        <BrandButton label="Reintentar" onPress={recargar} />
      </SafeAreaView>
    );
  }

  if (pedidos.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6">
        <Text className="font-display-bold text-xl text-ink pt-4">Pedidos</Text>
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("../../src/assets/mascots/cuy_delivery.png")}
            style={{ width: 120, height: 136, marginBottom: 16 }}
            contentFit="contain"
          />
          <Text className="font-display text-2xl text-ink text-center mb-2">Aún no pides nada</Text>
          <Text className="font-body text-ink/60 text-center mb-8">
            Cuando hagas tu primer pedido, aquí podrás seguirlo y repetirlo con un toque.
          </Text>
          <BrandButton label="Explorar negocios" onPress={() => router.push("/(tabs)/explorar")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor="#E5131B" colors={["#E5131B"]} />}
      >
        <Text className="font-display-bold text-xl text-ink mb-1">Pedidos</Text>
        <Text className="font-body text-sm text-ink/50 mb-5">
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} en total
        </Text>

        {enCurso.length > 0 && (
          <>
            <Text className="font-display-bold text-base text-ink mb-3">En curso</Text>
            {enCurso.map((p) => (
              <TarjetaEnCurso key={p.id} pedido={p} />
            ))}
          </>
        )}

        {anteriores.length > 0 && (
          <>
            <Text className={`font-display-bold text-base text-ink mb-3 ${enCurso.length > 0 ? "mt-3" : ""}`}>
              Anteriores
            </Text>
            {anteriores.map((p) => (
              <TarjetaAnterior key={p.id} pedido={p} onRepetir={() => repetir(p)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
