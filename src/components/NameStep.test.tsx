import { screen, within } from "@testing-library/react";
import { renderWithLanguage as render } from "../test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NameStep } from "./NameStep";

describe("NameStep", () => {
  it("disables continuing until a name is typed", async () => {
    const user = userEvent.setup();
    render(<NameStep initialMakeOwnPizza={false} initialName="" onSubmit={vi.fn()} />);
    const button = screen.getByRole("button", { name: /pick toppings/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/your name/i), "   ");
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    expect(button).toBeEnabled();
  });

  it("submits the name on button click and on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NameStep initialMakeOwnPizza={false} initialName="" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    expect(onSubmit).toHaveBeenCalledWith("Henrik", false);
    await user.type(screen.getByLabelText(/your name/i), "{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("does not submit a blank name via Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NameStep initialMakeOwnPizza={false} initialName="" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/your name/i), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills a remembered name", () => {
    render(<NameStep initialMakeOwnPizza={false} initialName="Anna" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Anna");
    expect(screen.getByRole("button", { name: /pick toppings/i })).toBeEnabled();
  });

  it("renders in Swedish", () => {
    render(<NameStep initialMakeOwnPizza={false} initialName="" onSubmit={vi.fn()} />, {
      language: "sv",
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vem är hungrig?");
    expect(screen.getByLabelText("Ditt namn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /välj toppings/i })).toBeDisabled();
  });

  it("marks the first step as current", () => {
    render(<NameStep initialMakeOwnPizza={false} initialName="" onSubmit={vi.fn()} />);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Name");
  });

  it("asks whether the customer makes their own pizza, No by default", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NameStep initialMakeOwnPizza={false} initialName="Anna" onSubmit={onSubmit} />);
    const question = screen.getByRole("radiogroup", { name: "I want to make my own pizza" });
    expect(within(question).getByRole("radio", { name: "No" })).toBeChecked();
    await user.click(within(question).getByRole("radio", { name: "Yes" }));
    expect(within(question).getByRole("radio", { name: "Yes" })).toBeChecked();
    expect(within(question).getByRole("radio", { name: "No" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    expect(onSubmit).toHaveBeenCalledWith("Anna", true);
  });

  it("keeps an earlier Yes and asks in Swedish", () => {
    render(<NameStep initialMakeOwnPizza initialName="" onSubmit={vi.fn()} />, { language: "sv" });
    const question = screen.getByRole("radiogroup", { name: "Jag vill göra min egen pizza" });
    expect(within(question).getByRole("radio", { name: "Ja" })).toBeChecked();
  });
});
