import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { BrandButton } from "../../components/BrandButton";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleLogin() {
    setError(null);
    setEnviando(true);
    const { error } = await signIn(email.trim(), password);
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/(onboarding)/ubicacion");
  }

  return (
    <SafeAreaView className="flex-1 bg-cream px-6 justify-center">
      <Image
        source={require("../../src/assets/images/logo_wordmark.png")}
        style={{ width: 200, height: 101, alignSelf: "center", marginBottom: 32 }}
        contentFit="contain"
      />
      <Text className="font-display text-2xl text-ink text-center mb-6">Inicia sesión</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Correo electrónico"
        placeholderTextColor="rgba(36,31,33,0.4)"
        autoCapitalize="none"
        keyboardType="email-address"
        className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-3"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        placeholderTextColor="rgba(36,31,33,0.4)"
        secureTextEntry
        className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-3"
      />

      {error && <Text className="font-body text-chili text-sm mb-3">{error}</Text>}

      <View className="mb-4">
        <BrandButton label={enviando ? "Ingresando..." : "Ingresar"} onPress={handleLogin} />
      </View>

      <Link href="/(auth)/registro" asChild>
        <Pressable>
          <Text className="font-body-semibold text-maroon text-center">
            ¿No tienes cuenta? <Text className="text-chili">Regístrate</Text>
          </Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
