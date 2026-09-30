import { cleanup, screen, within } from "@testing-library/react";
import { renderWithLanguage as render } from "../test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { testMenu } from "../test/fixtures";
import { ToppingsStep } from "./ToppingsStep";

const baseProps = {
  menu: testMenu,
  customerName: "Henrik",
  isSelected: () => false,
  atLimit: false,
  selectedCount: 0,
  onToggle: vi.fn(),
  comment: "",
  onCommentChange: vi.fn(),
  onClear: vi.fn(),
  onBack: vi.fn(),
  onContinue: vi.fn(),
};

describe("ToppingsStep", () => {
  it("renders every topping grouped under its heading", () => {
    render(<ToppingsStep {...baseProps} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build your pizza, Henrik");
    const meat = screen.getByRole("region", { name: "Meat" });
    expect(
      within(meat)
        .getAllByRole("checkbox")
        .map((c) => c.textContent),
    ).toEqual([expect.stringContaining("Ham"), expect.stringContaining("Salami")]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(testMenu.toppings.length);
    expect(screen.getByText(/pick up to 3 toppings/i)).toBeInTheDocument();
  });

  it("shows the menu note in the current language, and nothing without one", () => {
    const { unmount } = render(<ToppingsStep {...baseProps} />);
    expect(screen.getByText("Every pizza comes with tomato sauce and cheese.")).toBeInTheDocument();
    unmount();
    render(<ToppingsStep {...baseProps} />, { language: "sv" });
    expect(screen.getByText("Alla pizzor har tomatsås och ost.")).toBeInTheDocument();
    cleanup();
    render(<ToppingsStep {...baseProps} menu={{ ...testMenu, note: undefined }} />);
    expect(screen.queryByText(/tomato sauce/i)).not.toBeInTheDocument();
  });

  it("toggles a topping when tapped", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ToppingsStep {...baseProps} onToggle={onToggle} />);
    await user.click(screen.getByRole("checkbox", { name: /olives/i }));
    expect(onToggle).toHaveBeenCalledWith("olives");
  });

  it("reflects selection state and count", () => {
    render(<ToppingsStep {...baseProps} isSelected={(id) => id === "ham"} selectedCount={1} />);
    expect(screen.getByRole("checkbox", { name: /ham/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /olives/i })).not.toBeChecked();
    expect(screen.getByText("1 of 3 selected")).toBeInTheDocument();
  });

  it("disables review with nothing selected and continues otherwise", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const { rerender } = render(<ToppingsStep {...baseProps} onContinue={onContinue} />);
    expect(screen.getByRole("button", { name: /review/i })).toBeDisabled();
    rerender(<ToppingsStep {...baseProps} onContinue={onContinue} selectedCount={2} />);
    await user.click(screen.getByRole("button", { name: /review/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("blocks unselected toppings at the limit but lets selected ones be removed", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ToppingsStep
        {...baseProps}
        atLimit
        selectedCount={3}
        isSelected={(id) => id !== "olives"}
        onToggle={onToggle}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/maximum/i);
    await user.click(screen.getByRole("checkbox", { name: /olives/i }));
    expect(onToggle).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: /ham/i }));
    expect(onToggle).toHaveBeenCalledWith("ham");
  });

  it("offers clear all only when something is selected", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { rerender } = render(<ToppingsStep {...baseProps} onClear={onClear} />);
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
    rerender(<ToppingsStep {...baseProps} onClear={onClear} selectedCount={1} />);
    await user.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("goes back to the name step", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ToppingsStep {...baseProps} onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: /not henrik/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders topping and group names in Swedish", () => {
    render(<ToppingsStep {...baseProps} />, { language: "sv" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bygg din pizza, Henrik");
    expect(screen.getByRole("region", { name: "Kött" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Skinka" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Ham" })).not.toBeInTheDocument();
    expect(screen.getByText(/välj upp till 3 toppings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /granska/i })).toBeInTheDocument();
  });

  it("describes an unlimited menu", () => {
    render(<ToppingsStep {...baseProps} menu={{ ...testMenu, maxToppings: undefined }} />);
    expect(screen.getByText(/as many toppings as you like/i)).toBeInTheDocument();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("takes an optional comment below the toppings", async () => {
    const user = userEvent.setup();
    const onCommentChange = vi.fn();
    const { rerender } = render(<ToppingsStep {...baseProps} onCommentChange={onCommentChange} />);
    const field = screen.getByRole("textbox", { name: /comment/i });
    await user.type(field, "!");
    expect(onCommentChange).toHaveBeenCalledWith("!");
    rerender(<ToppingsStep {...baseProps} comment="Extra crispy" />);
    expect(screen.getByRole("textbox", { name: /comment/i })).toHaveValue("Extra crispy");
  });

  it("labels the comment in Swedish", () => {
    render(<ToppingsStep {...baseProps} />, { language: "sv" });
    expect(screen.getByRole("textbox", { name: /kommentar/i })).toBeInTheDocument();
  });
});
