import { StyleSheet, Text, View } from "react-native";
import { useColors } from "../theme/colors";
import { AllergyMatch } from "../services/allergy-check.service";

interface HighlightedTextProps {
  text: string;
  matches: AllergyMatch[];
}

export default function HighlightedText({ text, matches }: HighlightedTextProps) {
  const colors = useColors();

  if (!text || matches.length === 0) {
    return null;
  }

  // Находим все совпадения в тексте
  const getHighlightedParts = () => {
    const parts: { text: string; isHighlight: boolean; match?: AllergyMatch }[] = [];
    const textLower = text.toLowerCase();
    let lastIndex = 0;

    // Сортируем совпадения по позиции
    const sortedMatches: { start: number; end: number; match: AllergyMatch }[] = [];

    matches.forEach((match) => {
      const substance = match.substance.toLowerCase();
      let index = textLower.indexOf(substance);

      while (index !== -1) {
        sortedMatches.push({
          start: index,
          end: index + substance.length,
          match,
        });
        index = textLower.indexOf(substance, index + 1);
      }
    });

    sortedMatches.sort((a, b) => a.start - b.start);

    sortedMatches.forEach((match) => {
      if (match.start > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.start),
          isHighlight: false,
        });
      }
      parts.push({
        text: text.substring(match.start, match.end),
        isHighlight: true,
        match: match.match,
      });
      lastIndex = match.end;
    });

    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isHighlight: false,
      });
    }

    return parts.length > 0 ? parts : [{ text, isHighlight: false }];
  };

  const parts = getHighlightedParts();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {parts.map((part, index) => (
          <Text
            key={index}
            style={[
              part.isHighlight && {
                backgroundColor: part.match?.severity === "critical" ? colors.error : colors.warning,
                color: colors.white,
                fontWeight: "600",
                paddingHorizontal: 2,
                borderRadius: 3,
              },
            ]}
          >
            {part.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  text: {
    fontSize: 14,
  },
});

