import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../../components/SafeAreaView";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlanWizard } from "../../../context/PlanWizardContext";
import { ANTOJOS, INGREDIENTES, type Receta } from "../../../lib/catalogo";
import { recetaDelPlan } from "../../../lib/ia";
import { buscarReceta, enComun, recetasParecidas } from "../../../lib/recetas";

export default function RecetaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = usePlanWizard();
  const local = recetaDelPlan(data, id);
  // Una receta del dataset abierta desde "Recetas parecidas" no está en el
  // plan: se trae de Supabase.
  const [remota, setRemota] = useState<Receta | null | undefined>(local ? null : undefined);
  const [parecidas, setParecidas] = useState<Receta[] | null>(null);
  const receta = local ?? remota ?? undefined;

  useEffect(() => {
    if (local) return;
    let vigente = true;
    setRemota(undefined);
    buscarReceta(id).then((r) => vigente && setRemota(r));
    return () => {
      vigente = false;
    };
  }, [id, local]);

  const recetaId = receta?.id;
  useEffect(() => {
    if (!receta) return;
    let vigente = true;
    setParecidas(null);
    recetasParecidas(receta, data).then((r) => vigente && setParecidas(r));
    return () => {
      vigente = false;
    };
    // Solo cuando cambia la receta o lo que la persona puede comer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recetaId, data.restricciones, data.electrodomesticos]);

  if (!receta && remota === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center px-6">
        <ActivityIndicator color="#E5131B" />
      </SafeAreaView>
    );
  }

  if (!receta) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center px-6">
        <Text className="font-body text-ink/60">Receta no encontrada.</Text>
      </SafeAreaView>
    );
  }

  const ingredienteIcono = INGREDIENTES.find((ing) => ing.id === receta.ingredienteIcono);
  const antojo = ANTOJOS.find((a) => a.id === receta.antojoId);

  return (
    // Con foto, la imagen va de borde a borde bajo la barra de estado; sin foto
    // (todas las del dataset) el título quedaba encima de la hora y la batería.
    <SafeAreaView
      className="flex-1 bg-cream"
      edges={receta.foto ? ["bottom", "left", "right"] : ["top", "bottom", "left", "right"]}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {receta.foto ? (
          <View style={{ position: "relative" }}>
            <Image source={receta.foto} style={{ width: "100%", height: 280 }} contentFit="cover" />
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 130,
                backgroundColor: "rgba(36,31,33,0.55)",
              }}
            />
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Atrás"
              className="absolute top-4 left-6 w-9 h-9 rounded-full bg-black/30 items-center justify-center active:opacity-70"
            >
              <Ionicons name="arrow-back" size={20} color="#FDF3E7" />
            </Pressable>

            <View className="absolute left-6 right-6 bottom-4">
              <Text className="font-display text-3xl text-cream mb-2">{receta.nombre}</Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                {antojo && (
                  <View className="bg-cream/20 rounded-full px-3 py-1">
                    <Text className="font-body-bold text-xs text-cream">{antojo.nombre}</Text>
                  </View>
                )}
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="#FDF3E7" />
                  <Text className="font-body text-xs text-cream ml-1">{receta.tiempoMin} min</Text>
                </View>
                <Text className="font-display-bold text-sm text-mango">S/ {receta.precio}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="px-6">
            <View className="flex-row items-center pt-2 pb-4">
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                className="mr-3 active:opacity-60"
                accessibilityRole="button"
                accessibilityLabel="Atrás"
              >
                <Ionicons name="arrow-back" size={24} color="#241F21" />
              </Pressable>
              <Text className="font-display-bold text-lg text-ink flex-1">{receta.nombre}</Text>
            </View>

            <View className="bg-white rounded-3xl p-5 border border-ink/10 mb-6 items-center">
              <View className="w-20 h-20 rounded-2xl bg-peach/40 items-center justify-center mb-3">
                {ingredienteIcono && (
                  <Image source={ingredienteIcono.icono} style={{ width: 48, height: 48 }} contentFit="contain" />
                )}
              </View>
              <Text className="font-display text-2xl text-ink text-center mb-2">{receta.nombre}</Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                {antojo && (
                  <View className="bg-peach/50 rounded-full px-3 py-1">
                    <Text className="font-body-bold text-xs text-maroon">{antojo.nombre}</Text>
                  </View>
                )}
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="rgba(36,31,33,0.5)" />
                  <Text className="font-body text-xs text-ink/50 ml-1">{receta.tiempoMin} min</Text>
                </View>
                <Text className="font-display-bold text-sm text-chili">S/ {receta.precio}</Text>
              </View>
            </View>
          </View>
        )}

        <View className="px-6" style={{ marginTop: receta.foto ? 20 : 0 }}>
          <Text className="font-display-bold text-base text-ink mb-3">Ingredientes</Text>
          <View className="bg-white rounded-2xl border border-ink/10 mb-6 overflow-hidden">
            {receta.ingredientes.map((item, i) => {
              const comprado = item.ingredienteId ? data.comprados.includes(item.ingredienteId) : false;
              return (
                <View
                  key={`${i}-${item.texto}`}
                  className={`flex-row items-center px-4 py-3 ${
                    i < receta.ingredientes.length - 1 ? "border-b border-ink/10" : ""
                  }`}
                >
                  {item.ingredienteId ? (
                    <Ionicons
                      name={comprado ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={comprado ? "#3A9D5D" : "rgba(36,31,33,0.3)"}
                      style={{ marginRight: 10 }}
                    />
                  ) : (
                    <View className="w-1.5 h-1.5 rounded-full bg-chili mr-3" style={{ marginLeft: 4, marginRight: 14 }} />
                  )}
                  <Text
                    className={`font-body text-sm flex-1 ${comprado ? "text-ink/40 line-through" : "text-ink"}`}
                  >
                    {item.texto}
                  </Text>
                  {comprado && (
                    <Text className="font-body-bold text-[10px] text-green-700" style={{ color: "#3A9D5D" }}>
                      Ya comprado
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <Text className="font-display-bold text-base text-ink mb-3">Preparación</Text>
          <View style={{ gap: 12 }}>
            {receta.pasos.map((paso, i) => (
              <View key={`${i}-${paso}`} className="flex-row items-start bg-white rounded-2xl border border-ink/10 p-4">
                <View className="w-7 h-7 rounded-full bg-chili items-center justify-center mr-3">
                  <Text className="font-display-bold text-xs text-cream">{i + 1}</Text>
                </View>
                <Text className="font-body text-sm text-ink flex-1" style={{ lineHeight: 20 }}>
                  {paso}
                </Text>
              </View>
            ))}
          </View>

          {parecidas === null ? (
            <ActivityIndicator color="#E5131B" style={{ marginTop: 28 }} />
          ) : parecidas.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Text className="font-display-bold text-base text-ink mb-1">Recetas parecidas</Text>
              <Text className="font-body text-xs text-ink/50 mb-3">
                Recetas reales que usan los mismos ingredientes y que tú puedes comer.
              </Text>
              <View style={{ gap: 10 }}>
                {parecidas.map((otra) => {
                  const comunes = enComun(receta, otra);
                  return (
                    <Pressable
                      key={otra.id}
                      onPress={() => router.push(`/(plan)/receta/${otra.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver ${otra.nombre}`}
                      className="flex-row items-center bg-white rounded-2xl border border-ink/10 p-4 active:opacity-70"
                    >
                      <View className="flex-1 mr-3">
                        <Text className="font-body-extrabold text-sm text-ink mb-1" numberOfLines={2}>
                          {otra.nombre}
                        </Text>
                        <Text className="font-body text-xs text-ink/50" numberOfLines={1}>
                          {otra.tiempoMin} min · S/ {otra.precio}
                          {comunes.length > 0 ? ` · También lleva ${comunes.slice(0, 3).join(", ")}` : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="rgba(36,31,33,0.4)" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
