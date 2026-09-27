import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { LanguageProvider } from "./LanguageContext";
import { useLanguage } from "./useLanguage";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

afterEach(() => vi.restoreAllMocks());

describe("LanguageProvider", () => {
  it("defaults from the browser locale", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("sv-SE");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("sv");
    expect(result.current.t.nameTitle).toBe("Vem är hungrig?");
  });

  it("prefers a remembered language over the browser locale", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("sv-SE");
    window.localStorage.setItem("dominos.language", "en");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("en");
  });

  it("switches, remembers and resolves localized config strings", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.l({ en: "Ham", sv: "Skinka" })).toBe("Ham");
    act(() => result.current.setLanguage("sv"));
    expect(result.current.language).toBe("sv");
    expect(result.current.l({ en: "Ham", sv: "Skinka" })).toBe("Skinka");
    expect(window.localStorage.getItem("dominos.language")).toBe("sv");
    expect(document.documentElement.lang).toBe("sv");
  });

  it("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useLanguage())).toThrow(/LanguageProvider/);
  });
});
