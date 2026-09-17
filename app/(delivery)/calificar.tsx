import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";

export default function CalificarScreen() {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);

  if (enviado) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 items-center justify-center">
        <Image
          source={require("../../src/assets/mascots/choclito.png")}
          style={{ width: 110, height: 110, marginBottom: 16 }}
          contentFit="contain"
        />
        <Text className="font-display text-2xl text-ink text-center mb-2">¡Gracias por tu pedido!</Text>
        <Text className="font-body text-ink/60 text-center mb-8">
          Tu calificación ayuda a otros vecinos a elegir mejor.
        </Text>
        <BrandButton label="Volver al inicio" onPress={() => router.replace("/(tabs)")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream px-6 pt-6">
      <Text className="font-display text-2xl text-ink text-center mb-1">¿Cómo estuvo tu pedido?</Text>
      <Text className="font-body text-sm text-ink/60 text-center mb-8">Bodega Don José</Text>

      <View className="flex-row justify-center mb-8">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setEstrellas(n)} hitSlop={6} className="mx-1">
            <Ionicons
              name={n <= estrellas ? "star" : "star-outline"}
              size={36}
              color={n <= estrellas ? "#F7941D" : "rgba(36,31,33,0.25)"}
            />
          </Pressable>
        ))}
      </View>

      <TextInput
        value={comentario}
        onChangeText={setComentario}
        placeholder="Cuéntanos qué te pareció (opcional)"
        placeholderTextColor="rgba(36,31,33,0.4)"
        multiline
        className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-8"
        style={{ minHeight: 90, textAlignVertical: "top" }}
      />

      <BrandButton
        label="Enviar calificación"
        disabled={estrellas === 0}
        onPress={() => setEnviado(true)}
      />
    </SafeAreaView>
  );
}
