import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlanWizard } from "../../context/PlanWizardContext";
import { useAuth } from "../../context/AuthContext";
import { ANTOJOS, INGREDIENTES, generarPlanSemana } from "../../lib/catalogo";
import { BrandButton } from "../../components/BrandButton";

const META_MISION = 3;

const SOMBRA_SUAVE = {
  shadowColor: "#241F21",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const SOMBRA_TARJETA = {
  shadowColor: "#241F21",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
};

function colorSegunGasto(pct: number) {
  if (pct < 60) return "#3A9D5D";
  if (pct < 90) return "#F7941D";
  return "#E5131B";
}

const DIA_ABREVIADO: Record<string, string> = {
  Lunes: "LUN",
  Martes: "MAR",
  Miércoles: "MIÉ",
  Jueves: "JUE",
  Viernes: "VIE",
  Sábado: "SÁB",
  Domingo: "DOM",
};

function rangoSemana() {
  const hoy = new Date();
  const diaSemana = (hoy.getDay() + 6) % 7; // lunes = 0
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diaSemana);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return `${lunes.getDate()} al ${domingo.getDate()}`;
}

export default function PlanScreen() {
  const { data } = usePlanWizard();
  const { nombre } = useAuth();
  const primerNombre = nombre.split(" ")[0];

  if (data.dias.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6">
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("../../src/assets/mascots/papi_papa_checklist.png")}
            style={{ width: 130, height: 130, marginBottom: 16 }}
            contentFit="contain"
          />
          <Text className="font-display text-2xl text-ink text-center mb-2">
            Aún no tienes un plan
          </Text>
          <Text className="font-body text-ink/60 text-center mb-8">
            Arma tu semana según lo que se te antoja y lo que tienes en casa.
          </Text>
          <BrandButton label="Armar mi plan" onPress={() => router.push("/(plan)/negocio")} />
        </View>
      </SafeAreaView>
    );
  }

  const plan = generarPlanSemana(data.dias, data.antojos);
  const gastoSemana = plan.reduce((s, p) => s + p.receta.precio, 0);
  const restante = Math.max(0, data.presupuesto - gastoSemana);
  const pct = Math.min(100, (gastoSemana / data.presupuesto) * 100);
  const misionProgreso = Math.min(data.comprados.length, META_MISION);
  const misionCompleta = misionProgreso >= META_MISION;
  const colorBarra = colorSegunGasto(pct);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView className="flex-1 px-6 pt-2" contentContainerStyle={{ paddingBottom: 16 }}>
        {/*
          Cabecera "Hola" calibrada a pixel por Edward: los translateY de
          nombre/subtítulo/pills son ajustes finos manuales, no accidentes.
          La mascota (más abajo) usa position absolute con top fijo, así que
          si cambia el tamaño de letra del saludo hay que reajustar su `top` a
          mano para que la mano siga apoyada en el borde de la tarjeta. El
          nombre se encoge (adjustsFontSizeToFit) en vez de partirse en dos
          líneas, así la altura de la cabecera no cambia con nombres largos.
        */}
        <View className="mb-6" style={{ position: "relative" }}>
          <Text
            className="font-display text-5xl text-ink pr-20"
            style={{ fontSize: 42, transform: [{ translateY: 17 }] }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {primerNombre ? `Hola, ${primerNombre}` : "Hola"}
          </Text>
          <Text
            className="font-body text-sm text-ink/50"
            style={{ marginBottom: 26, transform: [{ translateY: 18 }] }}
          >
            Semana del {rangoSemana()}
          </Text>

          <View className="flex-row" style={{ gap: 10, transform: [{ translateY: 7 }] }}>
            <View
              className="bg-white rounded-2xl pl-3 pr-4 py-3 flex-1 flex-row items-center"
              style={SOMBRA_SUAVE}
            >
              <Text style={{ fontSize: 22, marginRight: 8 }}>🔥</Text>
              <View>
                <Text className="font-body-semibold text-[11px] text-ink/45 leading-4">racha</Text>
                <Text className="font-display-bold text-lg text-ink leading-6">
                  {plan.length} días
                </Text>
              </View>
            </View>
            <View
              className="bg-white rounded-2xl pl-3 pr-4 py-3 flex-1 flex-row items-center"
              style={SOMBRA_SUAVE}
            >
              <Ionicons name="restaurant" size={20} color="#F7941D" style={{ marginRight: 8 }} />
              <View>
                <Text className="font-body-semibold text-[11px] text-ink/45 leading-4">comidas</Text>
                <Text className="font-display-bold text-lg text-ink leading-6">
                  {plan.length} listas
                </Text>
              </View>
            </View>
          </View>

          <Image
            source={require("../../src/assets/mascots/papi_papa_apunta.png")}
            style={{ width: 140, height: 140, position: "absolute", top: -25, right: -10 }}
            contentFit="contain"
          />
        </View>

        <View className="mb-6">
          <View className="bg-white rounded-[28px] p-5" style={SOMBRA_TARJETA}>
            <View className="flex-row items-center mb-3" style={{ gap: 4 }}>
              <Image
                source={require("../../src/assets/mascots/billetera.png")}
                style={{ width: 144, height: 144, marginLeft: -14, marginVertical: -18 }}
                contentFit="contain"
              />
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <Text
                    className="font-body-extrabold text-[11px] text-ink/45 flex-1 mr-1"
                    style={{ letterSpacing: 0.3 }}
                  >
                    DISPONIBLE PARA GASTAR
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.3)" />
                </View>
                <Text className="font-display text-6xl text-ink">S/ {restante}</Text>
              </View>
            </View>

            <View className="h-3 bg-ink/10 rounded-full overflow-hidden mb-2.5">
              <View
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: colorBarra }}
              />
            </View>

            <View className="flex-row justify-between">
              <Text className="font-body-semibold text-sm text-ink/45">
                S/ {gastoSemana} gastados
              </Text>
              <Text className="font-body-semibold text-sm text-ink/45">
                S/ {data.presupuesto} de presupuesto
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(plan)/comprar-yo-mismo")}
          className="bg-white rounded-2xl p-4 border border-ink/10 mb-6 flex-row items-center active:opacity-80"
        >
          <View className="w-10 h-10 rounded-full bg-mango/20 items-center justify-center mr-3">
            <Ionicons name={misionCompleta ? "checkmark-circle" : "flag-outline"} size={19} color="#F7941D" />
          </View>
          <View className="flex-1">
            <Text className="font-body-extrabold text-sm text-ink">Tu misión de hoy</Text>
            <Text className="font-body text-xs text-ink/50">
              {misionCompleta
                ? "¡Completada! Ya marcaste tus ingredientes."
                : `Marca ${META_MISION} ingredientes de tu lista como comprados`}
            </Text>
          </View>
          <Text className="font-display-bold text-sm text-mango ml-2">
            {misionProgreso}/{META_MISION}
          </Text>
        </Pressable>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-display-bold text-base text-ink">Tu semana</Text>
          <Text className="font-body text-xs text-ink/50">{plan.length} días planeados</Text>
        </View>

        {plan.map(({ dia, receta }, i) => {
          const ingrediente = INGREDIENTES.find((ing) => ing.id === receta.ingredienteIcono);
          return (
            <Pressable
              key={dia}
              onPress={() => router.push(`/(plan)/receta/${receta.id}`)}
              className="flex-row items-center bg-white rounded-2xl p-3 mb-2.5 border border-ink/10 active:opacity-70"
            >
              <Text className="font-body-extrabold text-xs text-chili w-9">
                {DIA_ABREVIADO[dia]}
              </Text>
              <View
                className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                  i % 2 === 0 ? "bg-peach/40" : "bg-mango/15"
                }`}
              >
                {ingrediente && (
                  <Image source={ingrediente.icono} style={{ width: 26, height: 26 }} contentFit="contain" />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-body-extrabold text-sm text-ink mb-1">{receta.nombre}</Text>
                <View className="flex-row items-center">
                  <View className="bg-peach/50 rounded-full px-2 py-0.5 mr-2">
                    <Text className="font-body-bold text-[10px] text-maroon">
                      {ANTOJOS.find((a) => a.id === receta.antojoId)?.nombre ?? receta.antojoId}
                    </Text>
                  </View>
                  <Text className="font-body text-xs text-ink/45">
                    {receta.tiempoMin} min · {data.personas}p
                  </Text>
                </View>
              </View>
              <Text className="font-display-bold text-sm text-chili ml-2">S/{receta.precio}</Text>
            </Pressable>
          );
        })}

        <View className="flex-row mt-2" style={{ gap: 10 }}>
          <View className="flex-1">
            <BrandButton
              label="Lista de compras"
              variant="outline"
              onPress={() => router.push("/(plan)/lista-compras")}
            />
          </View>
          <View className="flex-1">
            <BrandButton label="Pedir ahora" onPress={() => router.push("/(tabs)/explorar")} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
