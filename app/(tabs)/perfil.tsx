import { Text } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";

export default function PerfilScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream px-6 pt-4">
      <Text className="font-display-bold text-xl text-ink mb-6">Perfil</Text>
      <Text className="font-body text-ink/60">
        Direcciones, métodos de pago y preferencias. Pantalla base — pendiente de conectar con Supabase.
      </Text>
    </SafeAreaView>
  );
}
