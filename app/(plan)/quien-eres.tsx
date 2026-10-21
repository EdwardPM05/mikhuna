import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { WizardScreen } from "../../components/WizardScreen";
import { usePlanWizard } from "../../context/PlanWizardContext";
import type { NivelCocina, Objetivo, Perfil } from "../../supabase/functions/_shared/plan.ts";
import type { Region } from "../../supabase/functions/_shared/recetas.ts";

const PERFILES: { id: Perfil; emoji: string; titulo: string; detalle: string }[] = [
  { id: "estudiante", emoji: "🎒", titulo: "Recién cocino solo", detalle: "Estudio o trabajo y estoy aprendiendo" },
  { id: "foraneo", emoji: "🧳", titulo: "Extraño la comida de mi tierra", detalle: "Vivo lejos de casa" },
  { id: "objetivo", emoji: "💪", titulo: "Tengo un objetivo", detalle: "Comer más sano, ganar músculo o bajar de peso" },
  { id: "comer-rico", emoji: "😋", titulo: "Solo quiero comer rico", detalle: "Sin complicarme la semana" },
];

const REGIONES: { id: Region; nombre: string; mascota: number }[] = [
  { id: "costa", nombre: "Costa", mascota: require("../../src/assets/mascots/papi_papa_costa.png") },
  { id: "sierra", nombre: "Sierra", mascota: require("../../src/assets/mascots/papi_papa_sierra.png") },
  { id: "selva", nombre: "Selva", mascota: require("../../src/assets/mascots/papi_papa_selva.png") },
];

const OBJETIVOS: { id: Objetivo; nombre: string }[] = [
  { id: "sano", nombre: "Comer más sano" },
  { id: "musculo", nombre: "Ganar músculo" },
  { id: "bajar", nombre: "Bajar de peso" },
];

const NIVELES: { id: NivelCocina; nombre: string }[] = [
  { id: "principiante", nombre: "Recién empiezo" },
  { id: "me-defiendo", nombre: "Me defiendo" },
  { id: "experto", nombre: "Me encanta cocinar" },
];

function Chip({ activo, texto, onPress }: { activo: boolean; texto: string; onPress: () => void }) {
  return (
    <View className="px-1 mb-2">
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityLabel={texto}
        accessibilityState={{ checked: activo }}
        className={`rounded-full py-2.5 px-4 border-2 active:opacity-80 ${
          activo ? "border-chili bg-chili" : "border-ink/10 bg-white"
        }`}
      >
        <Text className={`font-body-extrabold text-sm ${activo ? "text-cream" : "text-ink"}`}>{texto}</Text>
      </Pressable>
    </View>
  );
}

export default function QuienEresScreen() {
  const { data, update } = usePlanWizard();

  function elegirPerfil(perfil: Perfil) {
    update({
      perfil,
      // Lo que no aplica al perfil nuevo se borra, para que no afecte el plan.
      region: perfil === "foraneo" ? data.region : null,
      objetivo: perfil === "objetivo" ? data.objetivo : null,
      nivelCocina: data.nivelCocina ?? (perfil === "estudiante" ? "principiante" : null),
    });
  }

  const completo =
    data.perfil !== null &&
    (data.perfil !== "foraneo" || data.region !== null) &&
    (data.perfil !== "objetivo" || data.objetivo !== null) &&
    data.nivelCocina !== null;

  return (
    <WizardScreen
      paso={1}
      titulo="¿Quién eres?"
      subtitulo="Así tu plan se arma para ti, no para cualquiera."
      habilitado={completo}
      onContinuar={() => router.push("/(plan)/negocio")}
    >
      {PERFILES.map((opcion) => {
        const activo = data.perfil === opcion.id;
        return (
          <Pressable
            key={opcion.id}
            onPress={() => elegirPerfil(opcion.id)}
            accessibilityRole="radio"
            accessibilityLabel={`${opcion.titulo}. ${opcion.detalle}`}
            accessibilityState={{ checked: activo }}
            className={`flex-row items-center rounded-2xl p-4 mb-2.5 border-2 active:opacity-80 ${
              activo ? "border-chili bg-chili/5" : "border-ink/10 bg-white"
            }`}
          >
            <Text style={{ fontSize: 26, marginRight: 12 }}>{opcion.emoji}</Text>
            <View className="flex-1">
              <Text className={`font-body-extrabold text-sm ${activo ? "text-chili" : "text-ink"}`}>
                {opcion.titulo}
              </Text>
              <Text className="font-body text-xs text-ink/55">{opcion.detalle}</Text>
            </View>
          </Pressable>
        );
      })}

      {data.perfil === "foraneo" && (
        <View className="mt-3">
          <Text className="font-body-bold text-sm text-ink mb-3">¿De qué comida te acuerdas?</Text>
          <View className="flex-row" style={{ gap: 10 }}>
            {REGIONES.map((region) => {
              const activo = data.region === region.id;
              return (
                <Pressable
                  key={region.id}
                  onPress={() => update({ region: region.id })}
                  accessibilityRole="radio"
                  accessibilityLabel={`Comida de la ${region.nombre.toLowerCase()}`}
                  accessibilityState={{ checked: activo }}
                  className={`flex-1 items-center rounded-2xl py-3 border-2 active:opacity-80 ${
                    activo ? "border-chili bg-chili/5" : "border-ink/10 bg-white"
                  }`}
                >
                  <Image source={region.mascota} style={{ width: 56, height: 56 }} contentFit="contain" />
                  <Text className={`font-body-extrabold text-xs mt-1 ${activo ? "text-chili" : "text-ink"}`}>
                    {region.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {data.perfil === "objetivo" && (
        <View className="mt-3">
          <Text className="font-body-bold text-sm text-ink mb-3">¿Cuál es tu objetivo?</Text>
          <View className="flex-row flex-wrap -mx-1">
            {OBJETIVOS.map((o) => (
              <Chip key={o.id} activo={data.objetivo === o.id} texto={o.nombre} onPress={() => update({ objetivo: o.id })} />
            ))}
          </View>
        </View>
      )}

      {data.perfil !== null && (
        <View className="mt-4">
          <Text className="font-body-bold text-sm text-ink mb-3">¿Qué tal te va en la cocina?</Text>
          <View className="flex-row flex-wrap -mx-1">
            {NIVELES.map((n) => (
              <Chip
                key={n.id}
                activo={data.nivelCocina === n.id}
                texto={n.nombre}
                onPress={() => update({ nivelCocina: n.id })}
              />
            ))}
          </View>
        </View>
      )}
    </WizardScreen>
  );
}
