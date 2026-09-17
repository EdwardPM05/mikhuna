import { Tabs } from "expo-router";
import { Image } from "expo-image";
import type { ColorValue } from "react-native";

const ICONOS = {
  plan: require("../../src/assets/tabs/plan.png"),
  explorar: require("../../src/assets/tabs/explorar.png"),
  pedidos: require("../../src/assets/tabs/pedidos.png"),
  perfil: require("../../src/assets/tabs/perfil.png"),
};

function IconoTab({ nombre, color }: { nombre: keyof typeof ICONOS; color: ColorValue }) {
  return (
    <Image
      source={ICONOS[nombre]}
      style={{ width: 24, height: 24 }}
      tintColor={color as string}
      contentFit="contain"
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E5131B",
        tabBarInactiveTintColor: "#241F21",
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "rgba(36,31,33,0.12)" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Plan",
          tabBarIcon: ({ color }) => <IconoTab nombre="plan" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explorar"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => <IconoTab nombre="explorar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <IconoTab nombre="pedidos" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <IconoTab nombre="perfil" color={color} />,
        }}
      />
    </Tabs>
  );
}
