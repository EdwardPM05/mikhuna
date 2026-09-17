import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BrandButton } from "../../components/BrandButton";

export default function MapaScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream px-6 justify-between py-8">
      <View>
        <Text className="font-display text-2xl text-ink mb-2">Confirma tu zona</Text>
        <Text className="font-body text-base text-ink/70 mb-6">
          Ajusta el pin sobre el mapa para confirmar dónde te llegan los pedidos.
        </Text>
        <View className="bg-peach rounded-3xl h-72 items-center justify-center">
          <Text className="font-body-semibold text-maroon">Mapa — pendiente de integrar</Text>
        </View>
      </View>
      <BrandButton label="Confirmar ubicación" onPress={() => router.push("/(onboarding)/modo")} />
    </SafeAreaView>
  );
}
