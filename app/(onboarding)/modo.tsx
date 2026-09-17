import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";

function ModoCard({
  title,
  subtitle,
  mascot,
  onPress,
}: {
  title: string;
  subtitle: string;
  mascot: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-ink/10 rounded-3xl p-5 flex-row items-center mb-4 active:opacity-80"
    >
      <Image source={mascot} style={{ width: 64, height: 64 }} contentFit="contain" />
      <View className="flex-1 ml-4">
        <Text className="font-display-bold text-lg text-ink mb-1">{title}</Text>
        <Text className="font-body text-sm text-ink/70">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function ModoScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream px-6 justify-center">
      <Text className="font-display text-2xl text-ink text-center mb-1">¿Qué quieres hacer hoy?</Text>
      <Text className="font-body text-base text-ink/70 text-center mb-8">
        Puedes cambiar de modo cuando quieras desde el home.
      </Text>

      <ModoCard
        title="Quiero planear mi semana"
        subtitle="Arma tu plan de comidas según lo que venden los negocios de tu zona."
        mascot={require("../../src/assets/mascots/papi_papa.png")}
        onPress={() => router.push("/(plan)/negocio")}
      />
      <ModoCard
        title="Quiero pedir algo ahora"
        subtitle="Delivery inmediato de bodegas, mercados y restaurantes afiliados."
        mascot={require("../../src/assets/mascots/cuy_delivery.png")}
        onPress={() => router.replace("/(tabs)/explorar")}
      />
    </SafeAreaView>
  );
}
