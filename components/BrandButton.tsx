import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
};

export function BrandButton({ label, onPress, variant = "primary", disabled = false }: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ opacity: disabled ? 0.35 : 1 }}
      className={
        isPrimary
          ? "bg-chili rounded-2xl py-4 px-6 items-center active:opacity-80"
          : "border-2 border-chili rounded-2xl py-4 px-6 items-center active:opacity-70"
      }
    >
      <Text
        className={
          isPrimary
            ? "text-cream font-display-bold text-base"
            : "text-chili font-display-bold text-base"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
