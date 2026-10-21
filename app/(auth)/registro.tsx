import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { BrandButton } from "../../components/BrandButton";

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creado, setCreado] = useState(false);

  async function handleRegistro() {
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    const { error } = await signUp(email.trim(), password, nombre.trim());
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    setCreado(true);
  }

  if (creado) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 justify-center items-center">
        <Text className="font-display text-2xl text-ink text-center mb-2">¡Cuenta creada!</Text>
        <Text className="font-body text-base text-ink/70 text-center mb-8">
          Revisa tu correo para confirmar tu cuenta antes de ingresar.
        </Text>
        <BrandButton label="Ir a iniciar sesión" onPress={() => router.replace("/(auth)/login")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream px-6 justify-center">
      <Image
        source={require("../../src/assets/images/logo_wordmark.png")}
        style={{ width: 180, height: 91, alignSelf: "center", marginBottom: 24 }}
        contentFit="contain"
      />
      <Text className="font-display text-2xl text-ink text-center mb-6">Crea tu cuenta</Text>

      <TextInput
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre"
        placeholderTextColor="rgba(36,31,33,0.4)"
        className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-3"
      />
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
        placeholder="Contraseña (mín. 6 caracteres)"
        placeholderTextColor="rgba(36,31,33,0.4)"
        secureTextEntry
        className="border border-ink/15 rounded-2xl px-4 py-3 font-body text-ink bg-white mb-3"
      />

      {error && <Text className="font-body text-chili text-sm mb-3">{error}</Text>}

      <View className="mb-4">
        <BrandButton label={enviando ? "Creando cuenta..." : "Crear cuenta"} onPress={handleRegistro} />
      </View>

      <Link href="/(auth)/login" asChild>
        <Pressable>
          <Text className="font-body-semibold text-maroon text-center">
            ¿Ya tienes cuenta? <Text className="text-chili">Inicia sesión</Text>
          </Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
