import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "../../context/AuthContext";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrdersContext";
import { RESTRICCIONES } from "../../lib/catalogo";

const SOMBRA_TARJETA = {
  shadowColor: "#241F21",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
};

function Dato({ icono, valor, etiqueta }: { icono: keyof typeof Ionicons.glyphMap; valor: string; etiqueta: string }) {
  return (
    <View className="flex-1 items-center">
      <Ionicons name={icono} size={18} color="#F7941D" />
      <Text className="font-display-bold text-lg text-ink mt-1" numberOfLines={1}>
        {valor}
      </Text>
      <Text className="font-body-semibold text-[11px] text-ink/45">{etiqueta}</Text>
    </View>
  );
}

function Fila({
  icono,
  titulo,
  detalle,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3.5 active:bg-ink/5">
      <View className="w-9 h-9 rounded-xl bg-peach/50 items-center justify-center mr-3">
        <Ionicons name={icono} size={18} color="#7A1220" />
      </View>
      <View className="flex-1">
        <Text className="font-body-bold text-sm text-ink">{titulo}</Text>
        {detalle ? (
          <Text className="font-body text-xs text-ink/50" numberOfLines={1}>
            {detalle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.3)" />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const { session, nombre, signOut } = useAuth();
  const { data } = usePlanWizard();
  const { vaciar } = useCart();
  const { pedidos } = useOrders();
  // Cerrar sesión pide un segundo toque: Alert con botones no funciona en web.
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const inicial = (nombre[0] ?? "?").toUpperCase();
  const restricciones = RESTRICCIONES.filter(
    (r) => r.id !== "ninguna" && data.restricciones.includes(r.id)
  );
  const tienePlan = data.dias.length > 0;

  async function cerrarSesion() {
    if (!confirmarSalida) {
      setConfirmarSalida(true);
      return;
    }
    setSaliendo(true);
    // El plan no se borra: queda guardado para cuando vuelva a entrar, y
    // PlanWizardContext ya lo saca de memoria al cambiar de usuario.
    await signOut();
    vaciar();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-display-bold text-xl text-ink mb-5">Perfil</Text>

        <View className="bg-white rounded-[28px] p-5 mb-6" style={SOMBRA_TARJETA}>
          <View className="flex-row items-center mb-5">
            <View className="w-16 h-16 rounded-full bg-chili items-center justify-center mr-4">
              <Text className="font-display text-3xl text-cream" style={{ lineHeight: 40 }}>
                {inicial}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-display-bold text-xl text-ink" numberOfLines={1}>
                {nombre || "Tu cuenta"}
              </Text>
              <Text className="font-body text-sm text-ink/50" numberOfLines={1}>
                {session?.user.email}
              </Text>
            </View>
          </View>

          <View className="flex-row bg-cream rounded-2xl py-3">
            <Dato icono="people-outline" valor={`${data.personas}`} etiqueta="personas" />
            <View className="w-px bg-ink/10" />
            <Dato icono="wallet-outline" valor={`S/ ${data.presupuesto}`} etiqueta="por semana" />
            <View className="w-px bg-ink/10" />
            <Dato icono="receipt-outline" valor={`${pedidos.length}`} etiqueta="pedidos" />
          </View>
        </View>

        <Text className="font-display-bold text-base text-ink mb-3">Tu cocina</Text>
        <View className="bg-white rounded-3xl border border-ink/10 mb-6 overflow-hidden">
          <Fila
            icono="location-outline"
            titulo="Mi distrito"
            detalle={data.distrito ?? "Sin elegir"}
            onPress={() => router.push("/(onboarding)/ubicacion")}
          />
          <View className="h-px bg-ink/10 ml-16" />
          <Fila
            icono="calendar-outline"
            titulo={tienePlan ? "Rehacer mi plan semanal" : "Armar mi plan semanal"}
            detalle={tienePlan ? `${data.dias.length} días planeados` : "Aún no tienes un plan"}
            onPress={() => router.push("/(plan)/negocio")}
          />
          <View className="h-px bg-ink/10 ml-16" />
          <Fila
            icono="receipt-outline"
            titulo="Mis pedidos"
            detalle={pedidos.length > 0 ? `${pedidos.length} en tu historial` : "Todavía ninguno"}
            onPress={() => router.push("/(tabs)/pedidos")}
          />
        </View>

        <Text className="font-display-bold text-base text-ink mb-3">Restricciones</Text>
        <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
          {restricciones.length > 0 ? (
            restricciones.map((r) => (
              <View key={r.id} className="flex-row items-center bg-white rounded-full pl-1.5 pr-3 py-1.5 border border-ink/10">
                <Image source={r.icono} style={{ width: 22, height: 22, marginRight: 6 }} contentFit="contain" />
                <Text className="font-body-bold text-xs text-ink">{r.nombre}</Text>
              </View>
            ))
          ) : (
            <Text className="font-body text-sm text-ink/50">
              Ninguna. Puedes cambiarlas al rehacer tu plan.
            </Text>
          )}
        </View>

        <Pressable
          onPress={cerrarSesion}
          disabled={saliendo}
          className={`flex-row items-center justify-center rounded-2xl py-4 border-2 active:opacity-70 ${
            confirmarSalida ? "bg-chili border-chili" : "border-chili/30 bg-white"
          }`}
        >
          <Ionicons name="log-out-outline" size={20} color={confirmarSalida ? "#FDF3E7" : "#E5131B"} />
          <Text className={`font-display-bold text-base ml-2 ${confirmarSalida ? "text-cream" : "text-chili"}`}>
            {saliendo ? "Cerrando sesión..." : confirmarSalida ? "Toca otra vez para salir" : "Cerrar sesión"}
          </Text>
        </Pressable>
        {confirmarSalida && !saliendo && (
          <Pressable onPress={() => setConfirmarSalida(false)} hitSlop={8} className="self-center mt-3">
            <Text className="font-body-semibold text-sm text-ink/50">Cancelar</Text>
          </Pressable>
        )}

        <Text className="font-body text-xs text-ink/30 text-center mt-8">
          Mikhuna v{Constants.expoConfig?.version ?? "—"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
