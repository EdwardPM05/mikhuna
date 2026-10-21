import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { armarPlan, preferenciasDe } from "../../lib/ia";

const PASOS = [
  "Entendiendo quién eres y lo que puedes comer",
  "Eligiendo recetas que te sirvan de verdad",
  "Armando tu semana y tu lista de compras",
];

const PASO_MS = 1100;
// Aunque el plan salga al instante, la animación se ve completa.
const DURACION_MINIMA_MS = PASOS.length * PASO_MS + 900;

const INGREDIENTES = [
  require("../../src/assets/ingredientes/aji.png"),
  require("../../src/assets/ingredientes/palta.png"),
  require("../../src/assets/ingredientes/tomate.png"),
  require("../../src/assets/ingredientes/limon.png"),
  require("../../src/assets/ingredientes/cebolla.png"),
  require("../../src/assets/ingredientes/ajo.png"),
  require("../../src/assets/ingredientes/choclo.png"),
  require("../../src/assets/ingredientes/culantro.png"),
];

const AURA = 360;
const RADIO = 150;
const TAMANO_ICONO = 52;
const TAMANO_MASCOTA = 180;

// Papi Papa cocinando, una pinta distinta por región — se elige al azar
// cada vez que se abre esta pantalla.
const PAPIS_REGIONALES = [
  require("../../src/assets/mascots/papi_papa_costa.png"),
  require("../../src/assets/mascots/papi_papa_sierra.png"),
  require("../../src/assets/mascots/papi_papa_selva.png"),
];

function OrbitaIngredientes() {
  const spin = useRef(new Animated.Value(0)).current;
  const [papi] = useState(
    () => PAPIS_REGIONALES[Math.floor(Math.random() * PAPIS_REGIONALES.length)]
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotarAro = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const rotarIcono = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });

  return (
    <View style={{ width: AURA, height: AURA, alignSelf: "center" }}>
      <Image
        source={papi}
        style={{
          width: TAMANO_MASCOTA,
          height: TAMANO_MASCOTA,
          position: "absolute",
          top: AURA / 2 - TAMANO_MASCOTA / 2,
          left: AURA / 2 - TAMANO_MASCOTA / 2,
        }}
        contentFit="contain"
      />

      <Animated.View
        style={{
          position: "absolute",
          width: AURA,
          height: AURA,
          transform: [{ rotate: rotarAro }],
        }}
      >
        {INGREDIENTES.map((fuente, i) => {
          const angulo = (360 / INGREDIENTES.length) * i;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                top: AURA / 2 - TAMANO_ICONO / 2,
                left: AURA / 2 - TAMANO_ICONO / 2,
                width: TAMANO_ICONO,
                height: TAMANO_ICONO,
                transform: [{ rotate: `${angulo}deg` }, { translateY: -RADIO }],
              }}
            >
              <Animated.View style={{ transform: [{ rotate: rotarIcono }] }}>
                <Image
                  source={fuente}
                  style={{ width: TAMANO_ICONO, height: TAMANO_ICONO }}
                  contentFit="contain"
                />
              </Animated.View>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

export default function GenerandoScreen() {
  const { data, update } = usePlanWizard();
  const [listos, setListos] = useState(0);

  useEffect(() => {
    let vigente = true;
    let salida: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    // El último paso se marca recién cuando el plan está listo: si la IA
    // tarda, la pantalla espera ahí en vez de fingir que terminó.
    const temporizadores = PASOS.slice(0, -1).map((_, i) =>
      setTimeout(() => setListos(i + 1), (i + 1) * PASO_MS)
    );
    armarPlan(preferenciasDe(data)).then(({ plan, fuente }) => {
      if (!vigente) return;
      update({ planSemana: plan, planFuente: fuente });
      const resto = Math.max(0, DURACION_MINIMA_MS - (Date.now() - inicio));
      salida = setTimeout(() => {
        setListos(PASOS.length);
        salida = setTimeout(() => router.replace("/(tabs)"), 500);
      }, Math.max(0, resto - 500));
    });
    return () => {
      vigente = false;
      temporizadores.forEach(clearTimeout);
      if (salida) clearTimeout(salida);
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-cream px-8 justify-center">
      <OrbitaIngredientes />

      <Text className="font-display text-2xl text-ink text-center mb-1 mt-2">
        Ya tengo todo listo
      </Text>
      <Text className="font-body text-base text-ink/70 text-center mb-10">
        Estamos armando tu semana…
      </Text>

      {PASOS.map((paso, i) => {
        const hecho = i < listos;
        return (
          <View key={paso} className="flex-row items-center mb-4">
            <View
              className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                hecho ? "bg-chili" : "border-2 border-ink/20"
              }`}
            >
              {hecho && <Ionicons name="checkmark" size={15} color="#FDF3E7" />}
            </View>
            <Text
              className={`font-body text-sm flex-1 ${hecho ? "text-ink" : "text-ink/40"}`}
            >
              {paso}
            </Text>
          </View>
        );
      })}
    </SafeAreaView>
  );
}
