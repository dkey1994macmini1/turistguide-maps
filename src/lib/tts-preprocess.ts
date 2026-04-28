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

// ── Polish number → words ──────────────────────────────────────────

const UNITS: Record<number, string> = {
  0: "zero", 1: "jeden", 2: "dwa", 3: "trzy", 4: "cztery",
  5: "pięć", 6: "sześć", 7: "siedem", 8: "osiem", 9: "dziewięć",
};

const TEENS: Record<number, string> = {
  10: "dziesięć", 11: "jedenaście", 12: "dwanaście", 13: "trzynaście",
  14: "czternaście", 15: "piętnaście", 16: "szesnaście",
  17: "siedemnaście", 18: "osiemnaście", 19: "dziewiętnaście",
};

const TENS: Record<number, string> = {
  2: "dwadzieścia", 3: "trzydzieści", 4: "czterdzieści", 5: "pięćdziesiąt",
  6: "sześćdziesiąt", 7: "siedemdziesiąt", 8: "osiemdziesiąt", 9: "dziewięćdziesiąt",
};

const HUNDREDS: Record<number, string> = {
  1: "sto", 2: "dwieście", 3: "trzysta", 4: "czterysta",
  5: "pięćset", 6: "sześćset", 7: "siedemset", 8: "osiemset", 9: "dziewięćset",
};

function pluralRules(n: number, forms: [string, string, string]): string {
  // forms: [1 element, 2-4 elements, 5+ elements / fractions]
  if (n === 1) return forms[0];
  const lastTwo = n % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return forms[2];
  const last = n % 10;
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function numberToPolish(n: number): string {
  if (Number.isNaN(n)) return "";
  if (n < 0) return "minus " + numberToPolish(-n);

  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return unit === 0 ? TENS[ten] : `${TENS[ten]} ${UNITS[unit]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0 ? HUNDREDS[h] : `${HUNDREDS[h]} ${numberToPolish(rest)}`;
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const thousandWord = pluralRules(thousands, ["tysiąc", "tysiące", "tysięcy"]);
    const prefix = thousands === 1
      ? "tysiąc"
      : `${numberToPolish(thousands)} ${thousandWord}`;
    return rest === 0 ? prefix : `${prefix} ${numberToPolish(rest)}`;
  }
  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    const millionWord = pluralRules(millions, ["milion", "miliony", "milionów"]);
    const prefix = millions === 1
      ? "milion"
      : `${numberToPolish(millions)} ${millionWord}`;
    return rest === 0 ? prefix : `${prefix} ${numberToPolish(rest)}`;
  }
  return String(n); // Fallback for very large numbers
}

// ── Emotion tagger (only for Polish) ────────────────────────────────

export function addEmotionTag(text: string, emotion: string): string {
  return emotion ? `[${emotion}] ${text}` : text;
}

export const EMOTION_MAP: Record<string, string> = {
  title: "z naciskiem, profesjonalnie",
  facts: "spokojnie, zwięźle",
  guide: "ciepło, z lokalną pasją",
  mustdo: "energicznie, zachęcająco",
  practical: "spokojnie, praktycznie",
  tips: "przyjaźnie, pomocnie",
  nearby: "",
  default: "spokojnie, narracyjnie",
};

// ── Main preprocessor ────────────────────────────────────────────────

export type Language = "pl" | "en" | string;

export function preprocessTtsText(text: string, _language?: Language): string {
  // For now English is identity; all rich normalization applies to Polish only.
  // When we explicitly detect/are told the language is non-Polish, return cleaned text only.
  const language = _language ?? "pl";
  if (language !== "pl") {
    return text.replace(/\s+/g, " ").trim();
  }

  let result = text;

  // 1. Liczby rzymskie + "wieku/w." → słownie
  result = result.replace(ROMAN_PATTERN, (_, roman: string) => {
    const word = ROMAN_TO_ORDINAL[roman.toUpperCase()];
    return word ? `${word} wieku` : `${roman} wieku`;
  });

  // 2. Rozwiń skróty
  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }

  // 3. Time: "godz. 15:00" / "15:30" → słownie
  result = result.replace(
    /\b(?:godz\.?\s+)?(\d{1,2}):(\d{2})\b/gi,
    (_, h: string, m: string) => {
      const hour = Number(h);
      const minute = Number(m);
      const hourStr = numberToPolish(hour);
      if (minute === 0) return `godzina ${hourStr}`;
      const minuteStr = numberToPolish(minute);
      return `godzina ${hourStr} ${minuteStr}`;
    }
  );

  // 4. Years: "1924 r." → "tysiąc dziewięćset dwudziestego czwartego roku"
  result = result.replace(/(?<!\S)(\d{4})\s*r\.(?!\S)/g, (_, year: string) => {
    return `${numberToPolish(Number(year))} roku`;
  });

  // 5. Altitude: "123 m n.p.m." → "sto dwadzieścia trzy metry nad poziomem morza"
  result = result.replace(
    /(?<!\S)(\d+)\s+m\s+n\.p\.m\.(?!\S)/g,
    (_, h: string) => `${numberToPolish(Number(h))} metrów nad poziomem morza`
  );

  // 6. Percentage: "73%" → "siedemdziesiąt trzy procent"
  result = result.replace(/(?<!\S)(\d+)%(?!\S)/g, (_, n: string) => {
    return `${numberToPolish(Number(n))} procent`;
  });

  // 7. Prices: "15 zł" / "10 $" / "€5"
  // Polish convention: amount first. Global convention: both sym-num and num-sym.
  result = result.replace(
    /(?<!\S)(\d[\d\s,.]*)\s*(zł|PLN)(?:\b|(?=\W|$))/gi,
    (_, num: string) => {
      const clean = num.replace(/[,\s]/g, "");
      const val = Number(clean);
      return `${numberToPolish(val)} złotych`;
    }
  );
  result = result.replace(
    /(?<!\S)(\$|€|£)\s*(\d[\d\s,.]*)(?:\b|(?=\W|$))/g,
    (_, sym: string, num: string) => {
      const clean = num.replace(/[,\s]/g, "");
      const val = Number(clean);
      const currency: Record<string, string> = {
        $: "dolarów",
        "€": "euro",
        "£": "funtów",
      };
      return `${numberToPolish(val)} ${currency[sym] || sym}`;
    }
  );
  // Also handle amount-then-symbol for euro/dollar (e.g. "25 €")
  result = result.replace(
    /(?<!\S)(\d[\d\s,.]*)\s*(\$|€|£)(?:\b|(?=\W|$))/g,
    (_, num: string, sym: string) => {
      const clean = num.replace(/[,\s]/g, "");
      const val = Number(clean);
      const currency: Record<string, string> = {
        $: "dolarów",
        "€": "euro",
        "£": "funtów",
      };
      return `${numberToPolish(val)} ${currency[sym] || sym}`;
    }
  );

  // 8. Numbers with units: "200 m" → "dwieście metrów", "2,5 km" → "dwa i pięć dziesiątych kilometra"
  // Decimal + units first (longest match)
  result = result.replace(
    /(?<!\S)(\d+),(\d+)\s*(km|m|cm|min|h)(?!\S)/gi,
    (_, whole: string, frac: string, unit: string) => {
      const unitMap: Record<string, string> = {
        km: "kilometra",
        m: "metra",
        cm: "centymetra",
        min: "minut",
        h: "godzin",
      };
      return `${numberToPolish(Number(whole))} i ${numberToPolish(Number(frac))} dziesiątych ${unitMap[unit.toLowerCase()] || unit}`;
    }
  );
  // Whole numbers + units
  result = result.replace(
    /(?<!\S)(\d+)\s*(km|m|min|h|osób|os)(?!\S)/g,
    (_, n: string, unit: string) => {
      const unitMap: Record<string, string> = {
        km: "kilometrów",
        m: "metrów",
        min: "minut",
        h: "godzin",
        osób: "osób",
        os: "osób",
      };
      return `${numberToPolish(Number(n))} ${unitMap[unit.toLowerCase()] || unit}`;
    }
  );

  // 9. Ranges: "20–30 min" → "od dwudziestu do trzydziestu minut"
  result = result.replace(
    /(?<!\S)(\d+)\s*[-–]\s*(\d+)\s*(min|h|m|km)(?!\S)/g,
    (_, n1: string, n2: string, unit: string) => {
      const unitMap: Record<string, string> = {
        min: "minut",
        h: "godzin",
        m: "metrów",
        km: "kilometrów",
      };
      return `od ${numberToPolish(Number(n1))} do ${numberToPolish(Number(n2))} ${unitMap[unit] || unit}`;
    }
  );

  // 10. Dodaj kropkę przed nowym zdaniem po 2+ spacji
  result = result.replace(
    new RegExp(`(${POLISH}{3,})\\s{2,}([A-ZĄĆĘŁŃÓŚŹŻ])`, "g"),
    "$1. $2"
  );

  // 11. Usuń nadmiarowe spacje
  result = result.replace(/\s+/g, " ").trim();

  return result;
}
