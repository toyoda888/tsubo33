import { PropsWithChildren, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useColors();

  return (
    <View className="bg-background">
      <TouchableOpacity
        className="flex-row items-center gap-1.5"
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name={isOpen ? "keyboard-arrow-down" : "keyboard-arrow-right"}
          size={18}
          color={colors.icon}
        />
        <Text className="text-base font-semibold text-foreground">{title}</Text>
      </TouchableOpacity>
      {isOpen && <View className="mt-1.5 ml-6">{children}</View>}
    </View>
  );
}
