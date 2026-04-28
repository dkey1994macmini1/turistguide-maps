import { describe, expect, it } from "vitest";
import { preprocessTtsText, numberToPolish, addEmotionTag, EMOTION_MAP } from "./tts-preprocess";

describe("numberToPolish", () => {
  it("konwertuje jednostki", () => {
    expect(numberToPolish(0)).toBe("zero");
    expect(numberToPolish(5)).toBe("pięć");
    expect(numberToPolish(9)).toBe("dziewięć");
  });

  it("konwertuje liczby 10-19", () => {
    expect(numberToPolish(10)).toBe("dziesięć");
    expect(numberToPolish(15)).toBe("piętnaście");
    expect(numberToPolish(19)).toBe("dziewiętnaście");
  });

  it("konwertuje dziesiątki", () => {
    expect(numberToPolish(20)).toBe("dwadzieścia");
    expect(numberToPolish(45)).toBe("czterdzieści pięć");
    expect(numberToPolish(99)).toBe("dziewięćdziesiąt dziewięć");
  });

  it("konwertuje setki", () => {
    expect(numberToPolish(100)).toBe("sto");
    expect(numberToPolish(123)).toBe("sto dwadzieścia trzy");
    expect(numberToPolish(999)).toBe("dziewięćset dziewięćdziesiąt dziewięć");
  });

  it("konwertuje tysiące", () => {
    expect(numberToPolish(1000)).toBe("tysiąc");
    expect(numberToPolish(2000)).toBe("dwa tysiące");
    expect(numberToPolish(5000)).toBe("pięć tysięcy");
    expect(numberToPolish(1234)).toBe("tysiąc dwieście trzydzieści cztery");
    expect(numberToPolish(10000)).toBe("dziesięć tysięcy");
    expect(numberToPolish(21000)).toBe("dwadzieścia jeden tysięcy");
  });

  it("konwertuje miliony", () => {
    expect(numberToPolish(1_000_000)).toBe("milion");
    expect(numberToPolish(2_000_000)).toBe("dwa miliony");
    expect(numberToPolish(5_000_000)).toBe("pięć milionów");
    expect(numberToPolish(1_234_567)).toBe("milion dwieście trzydzieści cztery tysiące pięćset sześćdziesiąt siedem");
  });

  it("obsługuje liczby ujemne", () => {
    expect(numberToPolish(-5)).toBe("minus pięć");
    expect(numberToPolish(-123)).toBe("minus sto dwadzieścia trzy");
  });
});

describe("preprocessTtsText – skróty", () => {
  it("rozwija ul.", () => {
    expect(preprocessTtsText("ul. Floriańska 10")).toBe("ulica Floriańska 10");
  });

  it("rozwija pl.", () => {
    expect(preprocessTtsText("pl. Główny")).toBe("plac Główny");
  });

  it("rozwija al.", () => {
    expect(preprocessTtsText("al. Mickiewicza")).toBe("aleja Mickiewicza");
  });

  it("rozwija św.", () => {
    expect(preprocessTtsText("Kościół św. Marii")).toBe("Kościół świętego Marii");
  });

  it("rozwija m.in.", () => {
    expect(preprocessTtsText("Zawiera m.in. ołtarz.")).toBe("Zawiera między innymi ołtarz.");
  });

  it("rozwija tj.", () => {
    expect(preprocessTtsText("Wiek XIV, tj. czternasty.")).toBe("Wiek XIV, to jest czternasty.");
  });

  it("rozwija tzw.", () => {
    expect(preprocessTtsText("tzw. styl gotycki")).toBe("tak zwany styl gotycki");
  });

  it("rozwija w. jako wiek", () => {
    expect(preprocessTtsText("zamek z XIV w.")).toContain("wieku");
  });
});

describe("preprocessTtsText – liczby rzymskie z wiekiem", () => {
  it("zamienia XIV wieku na czternastym wieku", () => {
    expect(preprocessTtsText("Zamek z XIV wieku.")).toBe("Zamek z czternastym wieku.");
  });

  it("zamienia X wieku na dziesiątym wieku", () => {
    expect(preprocessTtsText("Budowla z X wieku.")).toBe("Budowla z dziesiątym wieku.");
  });

  it("zamienia XVIII wieku na osiemnastym wieku", () => {
    expect(preprocessTtsText("Styl z XVIII wieku.")).toBe("Styl z osiemnastym wieku.");
  });

  it("nie zamienia cyfr arabskich", () => {
    expect(preprocessTtsText("W roku 1410.")).toBe("W roku 1410.");
  });

  it("nie zmienia tekstu bez 'wieku'", () => {
    expect(preprocessTtsText("Rozdział XIV opisuje...")).toBe("Rozdział XIV opisuje...");
  });
});

describe("preprocessTtsText – godziny", () => {
  it("konwertuje godz. 15:00", () => {
    expect(preprocessTtsText("Spotkanie o godz. 15:00.")).toBe("Spotkanie o godzina piętnaście.");
  });

  it("konwertuje 9:30", () => {
    expect(preprocessTtsText("Otwarte od 9:30.")).toBe("Otwarte od godzina dziewięć trzydzieści.");
  });
});

describe("preprocessTtsText – daty/lata", () => {
  it("konwertuje 1924 r.", () => {
    expect(preprocessTtsText("Zbudowano w 1924 r.")).toBe("Zbudowano w tysiąc dziewięćset dwadzieścia cztery roku");
  });

  it("konwertuje 2000 r.", () => {
    expect(preprocessTtsText("Ukończono w 2000 r.")).toBe("Ukończono w dwa tysiące roku");
  });
});

describe("preprocessTtsText – wysokość n.p.m.", () => {
  it("konwertuje 123 m n.p.m.", () => {
    expect(preprocessTtsText("Wzniesienie 123 m n.p.m.")).toBe("Wzniesienie sto dwadzieścia trzy metrów nad poziomem morza");
  });
});

describe("preprocessTtsText – procenty", () => {
  it("konwertuje 73%", () => {
    expect(preprocessTtsText("Wzrost o 73%")).toBe("Wzrost o siedemdziesiąt trzy procent");
  });

  it("konwertuje 5%", () => {
    expect(preprocessTtsText("Zniżka 5%")).toBe("Zniżka pięć procent");
  });
});

describe("preprocessTtsText – waluty", () => {
  it("konwertuje zł", () => {
    expect(preprocessTtsText("Cena 15 zł")).toBe("Cena piętnaście złotych");
  });

  it("konwertuje PLN", () => {
    expect(preprocessTtsText("Koszt 100 PLN")).toBe("Koszt sto złotych");
  });

  it("konwertuje $", () => {
    expect(preprocessTtsText("Bilet $10")).toBe("Bilet dziesięć dolarów");
  });

  it("konwertuje €", () => {
    expect(preprocessTtsText("Cena 25 €")).toBe("Cena dwadzieścia pięć euro");
  });

  it("konwertuje £", () => {
    expect(preprocessTtsText("Cena 5 £")).toBe("Cena pięć funtów");
  });
});

describe("preprocessTtsText – liczby z jednostkami", () => {
  it("konwertuje 200 m", () => {
    expect(preprocessTtsText("Odległość 200 m")).toBe("Odległość dwieście metrów");
  });

  it("konwertuje 5 km", () => {
    expect(preprocessTtsText("Dystans 5 km")).toBe("Dystans pięć kilometrów");
  });

  it("konwertuje 30 min", () => {
    expect(preprocessTtsText("Czas 30 min")).toBe("Czas trzydzieści minut");
  });

  it("konwertuje 2 h", () => {
    expect(preprocessTtsText("Podróż 2 h")).toBe("Podróż dwa godzin");
  });

  it("konwertuje 2,5 km (decimal)", () => {
    expect(preprocessTtsText("Długość 2,5 km")).toBe("Długość dwa i pięć dziesiątych kilometra");
  });
});

describe("preprocessTtsText – zakresy", () => {
  it("konwertuje 20–30 min", () => {
    expect(preprocessTtsText("Czas 20–30 min")).toBe("Czas od dwadzieścia do trzydzieści minut");
  });

  it("konwertuje 1-2 h (zwykły myślnik)", () => {
    expect(preprocessTtsText("Czas 1-2 h")).toBe("Czas od jeden do dwa godzin");
  });
});

describe("preprocessTtsText – angielski (identity)", () => {
  it("nie modyfikuje tekstu angielskiego", () => {
    const input = "The palace is located at 123 Main St. It costs $10 and takes 30 min.";
    expect(preprocessTtsText(input, "en")).toBe(input);
  });

  it("czyści spacje w tekście angielskim", () => {
    expect(preprocessTtsText("Hello   world", "en")).toBe("Hello world");
  });

  it("angielski to domyślny fallback 'en'", () => {
    const input = "Visit at 15:00 and pay €20 for 2 h.";
    expect(preprocessTtsText(input, "en")).toBe(input);
  });
});

describe("preprocessTtsText – interpunkcja i formatowanie", () => {
  it("usuwa nadmiarowe spacje", () => {
    expect(preprocessTtsText("Zamek   w   Krakowie.")).toBe("Zamek w Krakowie.");
  });

  it("usuwa wiodące i końcowe spacje", () => {
    expect(preprocessTtsText("  Zamek w Krakowie.  ")).toBe("Zamek w Krakowie.");
  });

  it("dodaje kropkę przed nowym zdaniem po podwójnej spacji", () => {
    const input = "Zamek wzniesiono w XIV wieku  Był siedzibą książąt";
    expect(preprocessTtsText(input)).toContain("wieku.");
  });
});

describe("preprocessTtsText – złożone przypadki", () => {
  it("poprawia pełny opis turystyczny", () => {
    const input = "Kościół św. Marii przy ul. Floriańskiej pochodzi z XIV wieku. Zawiera m.in. gotycki ołtarz.";
    const result = preprocessTtsText(input);
    expect(result).toContain("świętego Marii");
    expect(result).toContain("ulica Floriańskiej");
    expect(result).toContain("czternastym wieku");
    expect(result).toContain("między innymi");
  });

  it("nie modyfikuje tekstu bez skrótów ani liczb rzymskich (bez interpunkcji)", () => {
    const input = "Zamek stoi na wzgórzu i widok jest piękny";
    expect(preprocessTtsText(input)).toBe(input);
  });
});

describe("addEmotionTag", () => {
  it("dodaje tag emocji na początku tekstu", () => {
    expect(addEmotionTag("Witaj w Krakowie!", "ciepło, z lokalną pasją")).toBe(
      "[ciepło, z lokalną pasją] Witaj w Krakowie!"
    );
  });

  it("nie dodaje pustego tagu", () => {
    expect(addEmotionTag("Witaj!", "")).toBe("Witaj!");
  });
});

describe("EMOTION_MAP", () => {
  it("ma zdefiniowane emocje dla wszystkich sekcji", () => {
    expect(EMOTION_MAP.title).toBe("z naciskiem, profesjonalnie");
    expect(EMOTION_MAP.guide).toBe("ciepło, z lokalną pasją");
    expect(EMOTION_MAP.default).toBe("spokojnie, narracyjnie");
  });
});
