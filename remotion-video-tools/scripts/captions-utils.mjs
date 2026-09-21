// Склейка токенов whisper в слова — та же логика, что в src/shared/captions.ts,
// но для Node-скриптов (в .mjs нельзя импортировать TypeScript напрямую).
//
// Дублирование намеренное и минимальное: тянуть в скрипты сборщик ради
// тридцати строк дороже, чем держать их в двух местах. Правите одно —
// правьте и второе.

export const mergeIntoWords = (captions) => {
  const words = [];

  for (const token of captions) {
    const startsNewWord =
      token.text.startsWith(" ") || token.text.startsWith("\n");
    const previous = words[words.length - 1];

    if (!previous || startsNewWord) {
      words.push({ ...token });
      continue;
    }

    previous.text += token.text;
    previous.endMs = token.endMs;
    previous.timestampMs = Math.round((previous.startMs + token.endMs) / 2);
    if (
      typeof token.confidence === "number" &&
      (previous.confidence === null || token.confidence < previous.confidence)
    ) {
      previous.confidence = token.confidence;
    }
  }

  return words.filter((word) => word.text.trim().length > 0);
};

export const lowConfidenceWords = (captions, threshold = 0.6) =>
  captions.filter(
    (word) =>
      typeof word.confidence === "number" && word.confidence < threshold,
  );
