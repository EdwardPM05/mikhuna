import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FDF3E7" } }}>
      <Stack.Screen name="ubicacion" />
      <Stack.Screen name="mapa" />
      <Stack.Screen name="modo" />
    </Stack>
  );
}
