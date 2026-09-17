import { Stack } from "expo-router";

export default function PlanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FDF3E7" } }}>
      <Stack.Screen name="negocio" />
      <Stack.Screen name="hogar" />
      <Stack.Screen name="dias" />
      <Stack.Screen name="presupuesto" />
      <Stack.Screen name="antojo" />
      <Stack.Screen name="restricciones" />
      <Stack.Screen name="electrodomesticos" />
      <Stack.Screen name="generando" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="lista-compras"
        options={{ presentation: "transparentModal", animation: "fade" }}
      />
      <Stack.Screen name="comprar-delivery" />
      <Stack.Screen name="comprar-yo-mismo" />
      <Stack.Screen name="ingrediente/[id]" />
      <Stack.Screen name="carrito-ingredientes" />
      <Stack.Screen name="receta/[id]" />
    </Stack>
  );
}
