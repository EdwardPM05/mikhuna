import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "../../components/WizardScreen";
import { KitchenScene, type NivelCocina } from "../../components/KitchenScene";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { ELECTRODOMESTICOS } from "../../lib/catalogo";

const NIVELES: { id: NivelCocina; nombre: string; aparatos: string[] }[] = [
  { id: "basica", nombre: "Básica", aparatos: ["cocina"] },
  { id: "promedio", nombre: "Promedio", aparatos: ["cocina", "microondas", "licuadora", "arrocera"] },
  {
    id: "avanzada",
    nombre: "Avanzada",
    aparatos: ["cocina", "horno", "microondas", "licuadora", "arrocera", "freidora"],
  },
];

export default function ElectrodomesticosScreen() {
  const { data, update, toggle } = usePlanWizard();
  const [nivel, setNivel] = useState<NivelCocina>("promedio");

  function elegirNivel(id: NivelCocina) {
    setNivel(id);
    const preset = NIVELES.find((n) => n.id === id);
    if (preset) update({ electrodomesticos: preset.aparatos });
  }

  return (
    <WizardScreen
      paso={7}
      titulo="¿Qué tienes en tu cocina?"
      subtitulo="Solo sugerimos platos que puedas preparar de verdad. Toca los aparatos que sí tienes."
      habilitado={data.electrodomesticos.length > 0}
      etiqueta="Generar mi plan"
      onContinuar={() => router.push("/(plan)/generando")}
    >
      <View className="flex-row -mx-1 mb-4">
        {NIVELES.map((opcion) => {
          const activo = nivel === opcion.id;
          return (
            <View key={opcion.id} className="flex-1 px-1">
              <Pressable
                onPress={() => elegirNivel(opcion.id)}
                className={`rounded-xl py-2.5 items-center border-2 active:opacity-80 ${
                  activo ? "border-mango bg-mango" : "border-ink/10 bg-white"
                }`}
              >
                <Text
                  className={`font-body-extrabold text-xs ${activo ? "text-ink" : "text-ink/60"}`}
                >
                  {opcion.nombre}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View className="mb-5">
        <KitchenScene
          nivel={nivel}
          seleccionados={data.electrodomesticos}
          onToggle={(id) => toggle("electrodomesticos", id)}
        />
      </View>

      <View className="flex-row flex-wrap justify-center -mx-1">
        {ELECTRODOMESTICOS.filter((aparato) =>
          NIVELES.find((n) => n.id === nivel)?.aparatos.includes(aparato.id)
        ).map((aparato) => {
          const activo = data.electrodomesticos.includes(aparato.id);
          return (
            <View key={aparato.id} className="px-1 mb-3">
              <Pressable
                onPress={() => toggle("electrodomesticos", aparato.id)}
                className={`rounded-full py-3 px-4 border-2 active:opacity-80 ${
                  activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
                }`}
              >
                <Text
                  className={`font-body-extrabold text-sm ${activo ? "text-cream" : "text-ink"}`}
                >
                  {aparato.nombre}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </WizardScreen>
  );
}
