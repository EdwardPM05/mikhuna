import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { ANTOJOS } from "../../lib/catalogo";

const MAX = 3;

export default function AntojoScreen() {
  const { data, toggle } = usePlanWizard();

  return (
    <WizardScreen
      paso={6}
      titulo="¿Qué se te antoja esta semana?"
      subtitulo={`Elige hasta ${MAX} · ${data.antojos.length}/${MAX}`}
      habilitado={data.antojos.length > 0}
      onContinuar={() => router.push("/(plan)/restricciones")}
    >
      <View className="flex-row flex-wrap -mx-1.5">
        {ANTOJOS.map((antojo) => {
          const activo = data.antojos.includes(antojo.id);
          const bloqueado = !activo && data.antojos.length >= MAX;
          return (
            <View key={antojo.id} className="w-1/2 px-1.5 mb-3">
              <Pressable
                onPress={() => toggle("antojos", antojo.id, MAX)}
                style={{ opacity: bloqueado ? 0.4 : 1 }}
                className={`rounded-2xl p-4 border-2 items-center active:opacity-80 ${
                  activo ? "border-chili bg-chili/5" : "border-ink/10 bg-white"
                }`}
              >
                <Image
                  source={antojo.icono}
                  style={{ width: 48, height: 48, marginBottom: 8 }}
                  contentFit="contain"
                />
                <Text
                  className={`font-body-extrabold text-sm text-center ${
                    activo ? "text-chili" : "text-ink"
                  }`}
                >
                  {antojo.nombre}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </WizardScreen>
  );
}
