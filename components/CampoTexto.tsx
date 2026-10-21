import { useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = Omit<TextInputProps, "secureTextEntry" | "className"> & {
  icono: keyof typeof Ionicons.glyphMap;
  // muestra el ojito para ver/ocultar lo escrito
  contrasena?: boolean;
};

// Campo de los formularios de cuenta: ícono a la izquierda, borde chili al
// enfocar y, en contraseñas, botón para mostrar lo que se escribió.
export function CampoTexto({ icono, contrasena = false, onFocus, onBlur, ...rest }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 bg-white mb-3 border-2 ${
        enfocado ? "border-chili" : "border-ink/10"
      }`}
    >
      <Ionicons name={icono} size={18} color={enfocado ? "#E5131B" : "rgba(36,31,33,0.4)"} />
      <TextInput
        {...rest}
        secureTextEntry={contrasena && !visible}
        placeholderTextColor="rgba(36,31,33,0.4)"
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        className="flex-1 font-body text-ink py-3 ml-2.5"
      />
      {contrasena && (
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(36,31,33,0.45)" />
        </Pressable>
      )}
    </View>
  );
}
