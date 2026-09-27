import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NameStep } from "./NameStep";

describe("NameStep", () => {
  it("disables continuing until a name is typed", async () => {
    const user = userEvent.setup();
    render(<NameStep initialName="" onSubmit={vi.fn()} />);
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
    render(<NameStep initialName="" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    expect(onSubmit).toHaveBeenCalledWith("Henrik");
    await user.type(screen.getByLabelText(/your name/i), "{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("does not submit a blank name via Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NameStep initialName="" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/your name/i), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills a remembered name", () => {
    render(<NameStep initialName="Anna" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Anna");
    expect(screen.getByRole("button", { name: /pick toppings/i })).toBeEnabled();
  });

  it("marks the first step as current", () => {
    render(<NameStep initialName="" onSubmit={vi.fn()} />);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Name");
  });
});
