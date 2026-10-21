import { forwardRef } from "react";
import { View, type ViewProps } from "react-native";

type Props = ViewProps & { edges?: unknown; mode?: unknown };

// En web la librería emite padding: 0 explícito y pisa clases como px-6; un View plano las respeta.
export const SafeAreaView = forwardRef<View, Props>(({ edges, mode, ...rest }, ref) => (
  <View ref={ref} {...rest} />
));

SafeAreaView.displayName = "SafeAreaView";
