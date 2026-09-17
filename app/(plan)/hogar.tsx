import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";

export default function HogarScreen() {
  const { data, update } = usePlanWizard();

  function cambiar(delta: number) {
    const siguiente = data.personas + delta;
    if (siguiente < 1 || siguiente > 12) return;
    update({ personas: siguiente });
  }

  return (
    <WizardScreen
      paso={2}
      titulo="¿Para cuántos cocinas?"
      subtitulo="Con esto escalamos las porciones y el presupuesto."
      onContinuar={() => router.push("/(plan)/dias")}
    >
      <View className="items-center py-10">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => cambiar(-1)}
            className="w-14 h-14 rounded-full border-2 border-ink/15 bg-white items-center justify-center active:opacity-60"
          >
            <Ionicons name="remove" size={26} color="#241F21" />
          </Pressable>

          <View className="w-32 items-center">
            <Text className="font-display text-6xl text-ink">{data.personas}</Text>
            <Text className="font-body text-sm text-ink/60 mt-1">
              {data.personas === 1 ? "persona" : "personas"}
            </Text>
          </View>

          <Pressable
            onPress={() => cambiar(1)}
            className="w-14 h-14 rounded-full bg-chili items-center justify-center active:opacity-80"
          >
            <Ionicons name="add" size={26} color="#FDF3E7" />
          </Pressable>
        </View>
      </View>
    </WizardScreen>
  );
}
