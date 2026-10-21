import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { RESTRICCIONES } from "../../lib/catalogo";

export default function RestriccionesScreen() {
  const { data, update } = usePlanWizard();

  function seleccionar(id: string) {
    if (id === "ninguna") {
      update({ restricciones: data.restricciones.includes("ninguna") ? [] : ["ninguna"] });
      return;
    }
    const sinNinguna = data.restricciones.filter((r) => r !== "ninguna");
    update({
      restricciones: sinNinguna.includes(id)
        ? sinNinguna.filter((r) => r !== id)
        : [...sinNinguna, id],
    });
  }

  return (
    <WizardScreen
      paso={7}
      titulo="¿Alguna restricción alimentaria?"
      subtitulo="Marca todas las que apliquen."
      habilitado={data.restricciones.length > 0}
      onContinuar={() => router.push("/(plan)/electrodomesticos")}
    >
      <View className="flex-row flex-wrap justify-center -mx-1">
        {RESTRICCIONES.map((restriccion) => {
          const activo = data.restricciones.includes(restriccion.id);
          return (
            <View key={restriccion.id} className="px-1 mb-3">
              <Pressable
                onPress={() => seleccionar(restriccion.id)}
                className={`flex-row items-center rounded-full py-3 px-4 border-2 active:opacity-80 ${
                  activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
                }`}
              >
                <Image
                  source={restriccion.icono}
                  style={{ width: 22, height: 22, marginRight: 8 }}
                  contentFit="contain"
                />
                <Text
                  className={`font-body-extrabold text-sm ${activo ? "text-cream" : "text-ink"}`}
                >
                  {restriccion.nombre}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </WizardScreen>
  );
}
