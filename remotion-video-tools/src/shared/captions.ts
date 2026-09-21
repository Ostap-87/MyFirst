import type { Caption } from "@remotion/captions";

/**
 * Склейка токенов whisper в цельные слова.
 *
 * whisper.cpp с `tokenLevelTimestamps` отдаёт под-словные токены:
 * «вы|лож|ил», «один|аков|ых». Для страничных субтитров это неважно, но в
 * режиме одного слова в кадре появляются обрывки вроде «лож» и «аков».
 *
 * Правило разбиения у whisper простое и надёжное: новое слово всегда
 * начинается с ведущего пробела, продолжения и знаки препинания идут без
 * него. На этом и склеиваем, сохраняя время начала первого токена и время
 * конца последнего.
 */
export const mergeIntoWords = (captions: Caption[]): Caption[] => {
  const words: Caption[] = [];

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
    // Середину слова пересчитываем: на ней держится подсветка в караоке.
    previous.timestampMs = Math.round((previous.startMs + token.endMs) / 2);
    // Уверенность слова — по самому слабому токену: так видно, где
    // распознавание «поплыло» и текст стоит вычитать.
    if (
      typeof token.confidence === "number" &&
      (previous.confidence === null || token.confidence < previous.confidence)
    ) {
      previous.confidence = token.confidence;
    }
  }

  return words.filter((word) => word.text.trim().length > 0);
};

/**
 * Слова, в которых распознавание не уверено, — их нужно вычитать глазами.
 * Хвост дорожки с музыкой или шумом whisper любит достраивать выдуманной
 * фразой, и она приезжает в кадр как настоящая реплика.
 */
export const lowConfidenceWords = (
  captions: Caption[],
  threshold = 0.6,
): Caption[] =>
  captions.filter(
    (word) =>
      typeof word.confidence === "number" && word.confidence < threshold,
  );
