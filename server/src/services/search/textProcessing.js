const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "by",
]);

export function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text, { removeStopWords = true } = {}) {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  if (!removeStopWords) return tokens;
  return tokens.filter((token) => !STOP_WORDS.has(token));
}

export function stemToken(token) {
  if (!token || token.length < 4) return token;

  if (token.endsWith("ology")) return token.slice(0, -3);
  if (token.endsWith("iatrics")) return token.slice(0, -2);
  if (token.endsWith("ics")) return token.slice(0, -3);
  if (token.endsWith("ing")) return token.slice(0, -3);
  if (token.endsWith("ed")) return token.slice(0, -2);
  if (token.endsWith("es")) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 4) return token.slice(0, -1);

  return token;
}

export function processQueryTerms(text) {
  return tokenize(text).map(stemToken).filter(Boolean);
}
