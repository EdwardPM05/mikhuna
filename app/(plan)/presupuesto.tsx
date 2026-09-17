import { Text, View } from "react-native";
import { router } from "expo-router";
import Slider from "@react-native-community/slider";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";

export default function PresupuestoScreen() {
  const { data, update } = usePlanWizard();
  const porPersona = Math.round(data.presupuesto / Math.max(data.personas, 1));

  return (
    <WizardScreen
      paso={4}
      titulo="¿Cuál es tu presupuesto semanal?"
      subtitulo="Ajustamos los platos para no pasarnos de este monto."
      onContinuar={() => router.push("/(plan)/antojo")}
    >
      <View className="items-center py-8">
        <Text className="font-display text-5xl text-chili">
          S/ {data.presupuesto}
        </Text>
        <Text className="font-body text-sm text-ink/60 mt-2">
          ≈ S/ {porPersona} por persona a la semana
        </Text>
      </View>

      <Slider
        style={{ width: "100%", height: 44 }}
        minimumValue={40}
        maximumValue={600}
        step={10}
        value={data.presupuesto}
        onValueChange={(valor) => update({ presupuesto: Math.round(valor) })}
        minimumTrackTintColor="#E5131B"
        maximumTrackTintColor="rgba(36,31,33,0.15)"
        thumbTintColor="#F7941D"
      />

      <View className="flex-row justify-between mt-1">
        <Text className="font-body text-xs text-ink/50">S/ 40</Text>
        <Text className="font-body text-xs text-ink/50">S/ 600</Text>
      </View>
    </WizardScreen>
  );
}
