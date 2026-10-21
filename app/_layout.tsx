import "../global.css";
import { useFonts, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";
import { PlanWizardProvider } from "../context/PlanWizardContext";
import { CartProvider } from "../context/CartContext";
import { OrdersProvider } from "../context/OrdersContext";
import { colors } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// En web limita la app al ancho de un celular y la centra; en el celular no hace nada.
function PhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: colors.ink }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 430, overflow: "hidden", backgroundColor: colors.cream }}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <PlanWizardProvider>
        <CartProvider>
          <OrdersProvider>
            <StatusBar style="dark" />
            <PhoneFrame>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(plan)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(delivery)" />
              </Stack>
            </PhoneFrame>
          </OrdersProvider>
        </CartProvider>
      </PlanWizardProvider>
    </AuthProvider>
  );
}
