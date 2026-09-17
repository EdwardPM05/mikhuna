import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { NEGOCIOS } from "../../lib/catalogo";

export default function NegocioScreen() {
  const { data, update } = usePlanWizard();

  return (
    <WizardScreen
      paso={1}
      titulo="¿Dónde haces tus compras?"
      subtitulo={`Armamos tu plan alrededor de lo que vende este negocio${
        data.distrito ? ` en ${data.distrito}` : ""
      }.`}
      habilitado={data.negocioId !== null}
      onContinuar={() => router.push("/(plan)/hogar")}
    >
      {NEGOCIOS.map((negocio) => {
        const activo = data.negocioId === negocio.id;
        return (
          <Pressable
            key={negocio.id}
            onPress={() => update({ negocioId: negocio.id })}
            className={`flex-row items-center rounded-2xl p-4 mb-3 border-2 active:opacity-80 ${
              activo ? "border-chili bg-chili/5" : "border-ink/10 bg-white"
            }`}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: negocio.color }}
            >
              <Text className="font-display-bold text-cream text-sm">{negocio.inicial}</Text>
            </View>

            <View className="flex-1 ml-3">
              <Text className="font-body-extrabold text-ink text-base">{negocio.nombre}</Text>
              <View className="flex-row items-center mt-1">
                <Text className="font-body text-xs text-ink/60">{negocio.tipo}</Text>
                {negocio.deBarrio && (
                  <View className="ml-2 bg-peach rounded-full px-2 py-0.5">
                    <Text className="font-body-bold text-[10px] text-maroon">
                      Negocio de barrio
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                activo ? "border-chili bg-chili" : "border-ink/20"
              }`}
            >
              {activo && <View className="w-2 h-2 rounded-full bg-cream" />}
            </View>
          </Pressable>
        );
      })}
    </WizardScreen>
  );
}
