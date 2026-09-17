import { Stack } from "expo-router";

export default function DeliveryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FDF3E7" } }}>
      <Stack.Screen name="negocio/[id]" />
      <Stack.Screen name="carrito" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="seguimiento" options={{ gestureEnabled: false }} />
      <Stack.Screen name="calificar" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
