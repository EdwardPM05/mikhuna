import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { usePlanWizard } from "../context/PlanWizardContext";

export default function Index() {
  const { session, loading } = useAuth();
  const { data, listo } = usePlanWizard();

  if (loading || (session && !listo)) {
    return (
      <View className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator color="#E5131B" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Quien ya eligió distrito vuelve directo a la app; el onboarding es solo
  // para la primera vez (el distrito se cambia desde Perfil).
  if (data.distrito) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)/ubicacion" />;
}
