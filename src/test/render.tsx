import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { LanguageProvider } from "../i18n/LanguageContext";
import type { Language } from "../i18n/translations";

/** Renders inside the LanguageProvider, English unless told otherwise. */
export function renderWithLanguage(
  ui: ReactElement,
  { language = "en", ...options }: RenderOptions & { language?: Language } = {},
) {
  return render(ui, {
    wrapper: ({ children }) => <LanguageProvider initial={language}>{children}</LanguageProvider>,
    ...options,
  });
}
