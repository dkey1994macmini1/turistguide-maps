import { describe, expect, it } from "vitest";
import { preprocessTtsText } from "./tts-preprocess";

describe("preprocessTtsText", () => {
  describe("skróty", () => {
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

  describe("liczby rzymskie z wiekiem", () => {
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

  describe("interpunkcja i formatowanie", () => {
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

  describe("złożone przypadki", () => {
    it("poprawia pełny opis turystyczny", () => {
      const input = "Kościół św. Marii przy ul. Floriańskiej pochodzi z XIV wieku. Zawiera m.in. gotycki ołtarz.";
      const result = preprocessTtsText(input);
      expect(result).toContain("świętego Marii");
      expect(result).toContain("ulica Floriańskiej");
      expect(result).toContain("czternastym wieku");
      expect(result).toContain("między innymi");
    });

    it("nie modyfikuje tekstu bez skrótów ani liczb rzymskich", () => {
      const input = "Zamek stoi na wzgórzu. Widok jest piękny.";
      expect(preprocessTtsText(input)).toBe(input);
    });
  });
});
