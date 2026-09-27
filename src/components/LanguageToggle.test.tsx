import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithLanguage as render } from "../test/render";
import { LanguageToggle } from "./LanguageToggle";

describe("LanguageToggle", () => {
  it("shows both languages with the current one checked", () => {
    render(<LanguageToggle />, { language: "sv" });
    expect(screen.getByRole("radiogroup", { name: "Språk" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Svenska" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "English" })).not.toBeChecked();
  });

  it("switches language on tap", async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);
    await user.click(screen.getByRole("radio", { name: "Svenska" }));
    expect(screen.getByRole("radio", { name: "Svenska" })).toBeChecked();
    expect(screen.getByRole("radiogroup", { name: "Språk" })).toBeInTheDocument();
  });
});
