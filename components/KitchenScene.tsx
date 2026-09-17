import { Pressable, View } from "react-native";
import { Image } from "expo-image";

export type NivelCocina = "basica" | "promedio" | "avanzada";

const FONDOS = {
  basica: require("../src/assets/cocina/fondo_basica.jpg"),
  promedio: require("../src/assets/cocina/fondo_promedio.jpg"),
  avanzada: require("../src/assets/cocina/fondo_avanzada.jpg"),
};

const APARATOS: Record<string, { source: number; ratio: number; haloInset: number }> = {
  cocina: { source: require("../src/assets/cocina/cocina.png"), ratio: 3.69, haloInset: 26 },
  horno: { source: require("../src/assets/cocina/horno.png"), ratio: 1, haloInset: 7 },
  microondas: { source: require("../src/assets/cocina/microondas.png"), ratio: 1, haloInset: 7 },
  licuadora: { source: require("../src/assets/cocina/licuadora.png"), ratio: 1, haloInset: 7 },
  arrocera: { source: require("../src/assets/cocina/arrocera.png"), ratio: 1, haloInset: 7 },
  freidora: { source: require("../src/assets/cocina/freidora.png"), ratio: 1, haloInset: 7 },
};

type Slot = { id: string; left: number; top: number; width: number };

// Posiciones en % del lado del cuadro, calibradas contra cada fondo.
const SLOTS: Record<NivelCocina, Slot[]> = {
  basica: [
    { id: "cocina", left: 8, top: 38, width: 54 },
    { id: "freidora", left: 61, top: 36, width: 18 },
  ],
  promedio: [
    { id: "microondas", left: 9, top: 45, width: 20 },
    { id: "cocina", left: 23, top: 51, width: 48 },
    { id: "licuadora", left: 61, top: 43, width: 18 },
    { id: "arrocera", left: 78, top: 45, width: 17 },
  ],
  avanzada: [
    { id: "microondas", left: 8, top: 41, width: 20 },
    { id: "licuadora", left: 25, top: 41, width: 17 },
    { id: "cocina", left: 27, top: 46, width: 46 },
    { id: "horno", left: 38, top: 55, width: 24 },
    { id: "arrocera", left: 69, top: 42, width: 16 },
    { id: "freidora", left: 83, top: 50, width: 17 },
  ],
};

type Props = {
  nivel: NivelCocina;
  seleccionados: string[];
  onToggle: (id: string) => void;
};

export function KitchenScene({ nivel, seleccionados, onToggle }: Props) {
  return (
    <View
      className="w-full rounded-3xl overflow-hidden border-2 border-ink/10"
      style={{ aspectRatio: 1 }}
    >
      <Image source={FONDOS[nivel]} style={{ width: "100%", height: "100%" }} contentFit="cover" />

      {[...SLOTS[nivel]]
        .sort((a, b) => b.width - a.width)
        .map((slot) => {
        const aparato = APARATOS[slot.id];
        const activo = seleccionados.includes(slot.id);
        return (
          <Pressable
            key={slot.id}
            onPress={() => onToggle(slot.id)}
            style={{
              position: "absolute",
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.width}%`,
              aspectRatio: aparato.ratio,
            }}
          >
            {activo && (
              <View
                style={{
                  position: "absolute",
                  left: `${aparato.haloInset}%`,
                  top: `${aparato.haloInset}%`,
                  right: `${aparato.haloInset}%`,
                  bottom: `${aparato.haloInset}%`,
                  backgroundColor: "#E5131B",
                  opacity: 0.2,
                  borderRadius: 999,
                }}
              />
            )}
            <Image
              source={aparato.source}
              style={{ width: "100%", height: "100%", opacity: activo ? 1 : 0.3 }}
              contentFit="contain"
            />
          </Pressable>
        );
      })}
    </View>
  );
}
