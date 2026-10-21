import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { DIAS } from "../../lib/catalogo";

export default function DiasScreen() {
  const { data, toggle } = usePlanWizard();

  return (
    <WizardScreen
      paso={4}
      titulo="¿Qué días cocinarás?"
      subtitulo={
        data.dias.length === 0
          ? "Elige los días que quieres tener planificados."
          : `${data.dias.length} ${data.dias.length === 1 ? "día" : "días"} seleccionados`
      }
      habilitado={data.dias.length > 0}
      onContinuar={() => router.push("/(plan)/presupuesto")}
    >
      <View className="flex-row flex-wrap -mx-1.5">
        {DIAS.map((dia) => {
          const activo = data.dias.includes(dia);
          return (
            <View key={dia} className="w-1/2 px-1.5 mb-3">
              <Pressable
                onPress={() => toggle("dias", dia)}
                className={`rounded-2xl py-4 items-center border-2 active:opacity-80 ${
                  activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
                }`}
              >
                <Text
                  className={`font-body-extrabold text-sm ${activo ? "text-cream" : "text-ink"}`}
                >
                  {dia}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </WizardScreen>
  );
}
