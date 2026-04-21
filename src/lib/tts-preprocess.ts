const POLISH = "[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]";
const NOT_POLISH = `(?<!${POLISH})`;
const NOT_POLISH_AFTER = `(?!${POLISH})`;

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bul\./g, "ulica"],
  [/\bpl\./g, "plac"],
  [/\bal\./g, "aleja"],
  // \b nie działa z polskimi znakami — używamy lookbehind/lookahead
  [new RegExp(`${NOT_POLISH}św\\.${NOT_POLISH_AFTER}`, "g"), "świętego"],
  [/\bdr\./g, "doktora"],
  [/\bprof\./g, "profesora"],
  [/\bim\./g, "imienia"],
  [/\bm\.in\./g, "między innymi"],
  [/\btj\./g, "to jest"],
  [/\btzw\./g, "tak zwany"],
  [/\bitp\./g, "i tym podobne"],
  [/\bn\.e\./g, "naszej ery"],
  [/\bp\.n\.e\./g, "przed naszą erą"],
];

// Explicit list ordered longest-first to avoid partial matches
const ROMAN_NUMERALS =
  "XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|IX|VIII|VII|VI|IV|III|II|I|X";

// Matches "XIV wieku", "XIV wiek", "XIV w." — all replaced with "X-tym wieku"
const ROMAN_PATTERN = new RegExp(
  `\\b(${ROMAN_NUMERALS})\\s+w(?:ieku|iek|\\.)`,
  "g"
);

const ROMAN_TO_ORDINAL: Record<string, string> = {
  I: "pierwszym", II: "drugim", III: "trzecim", IV: "czwartym",
  V: "piątym", VI: "szóstym", VII: "siódmym", VIII: "ósmym",
  IX: "dziewiątym", X: "dziesiątym", XI: "jedenastym", XII: "dwunastym",
  XIII: "trzynastym", XIV: "czternastym", XV: "piętnastym",
  XVI: "szesnastym", XVII: "siedemnastym", XVIII: "osiemnastym",
  XIX: "dziewiętnastym", XX: "dwudziestym", XXI: "dwudziestym pierwszym",
};

export function preprocessTtsText(text: string): string {
  let result = text;

  // Liczby rzymskie + "wieku/w." → słownie
  result = result.replace(ROMAN_PATTERN, (_, roman: string) => {
    const word = ROMAN_TO_ORDINAL[roman.toUpperCase()];
    return word ? `${word} wieku` : `${roman} wieku`;
  });

  // Rozwiń skróty
  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }

  // Dodaj kropkę przed nowym zdaniem po 2+ spacji — tylko gdy poprzednie słowo ma 3+ znaki
  // (wyklucza przyimki: w, z, i, a, o, u, do itp.)
  result = result.replace(
    new RegExp(`(${POLISH}{3,})\\s{2,}([A-ZĄĆĘŁŃÓŚŹŻ])`, "g"),
    "$1. $2"
  );

  // Usuń nadmiarowe spacje
  result = result.replace(/\s+/g, " ").trim();

  return result;
}
