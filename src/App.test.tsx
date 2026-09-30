import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { testMenu } from "./test/fixtures";

describe("App", () => {
  it("walks from name to toppings to a WhatsApp link", async () => {
    const user = userEvent.setup();
    render(<App menu={testMenu} />);

    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build your pizza, Henrik");
    await user.click(screen.getByRole("checkbox", { name: /mozzarella/i }));
    await user.click(screen.getByRole("checkbox", { name: /olives/i }));
    await user.type(screen.getByRole("textbox", { name: /comment/i }), "Extra crispy");
    await user.click(screen.getByRole("button", { name: /review/i }));

    const link = screen.getByRole("link", { name: /send to baker bob/i });
    const text = new URL(link.getAttribute("href")!).searchParams.get("text")!;
    expect(text).toContain("Pizza order from Henrik");
    expect(text).toContain("🧀 Mozzarella");
    expect(text).toContain("🫒 Olives");
    expect(text).not.toContain("Ham");
    expect(text).toContain("🧑‍🍳 Make my own pizza: No");
    expect(text).toContain("💬 Comment:\nExtra crispy");
  });

  it("switches language mid-flow and keeps the selection", async () => {
    const user = userEvent.setup();
    render(<App menu={testMenu} />);
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    await user.click(screen.getByRole("checkbox", { name: "Ham" }));

    await user.click(screen.getByRole("radio", { name: "Svenska" }));
    expect(screen.getByRole("radio", { name: "Svenska" })).toBeChecked();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bygg din pizza, Henrik");
    expect(screen.getByRole("checkbox", { name: "Skinka" })).toBeChecked();
    expect(window.localStorage.getItem("dominos.language")).toBe("sv");

    await user.click(screen.getByRole("button", { name: /granska/i }));
    const link = screen.getByRole("link", { name: /skicka till bagare bob/i });
    const text = new URL(link.getAttribute("href")!).searchParams.get("text")!;
    expect(text).toContain("Pizzabeställning från Henrik");
    expect(text).toContain("🍖 Skinka");

    await user.click(screen.getByRole("radio", { name: "English" }));
    expect(screen.getByRole("link", { name: /send to baker bob/i })).toBeInTheDocument();
  });

  it("uses the committed menu by default", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/your name/i), "Anna");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(5);
  });

  it("keeps the selection when going back to change the name", async () => {
    const user = userEvent.setup();
    render(<App menu={testMenu} />);
    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    await user.click(screen.getByRole("checkbox", { name: /ham/i }));
    await user.click(screen.getByRole("button", { name: /not henrik/i }));
    await user.clear(screen.getByLabelText(/your name/i));
    await user.type(screen.getByLabelText(/your name/i), "Anna");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    expect(screen.getByRole("checkbox", { name: /ham/i })).toBeChecked();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Anna");
  });

  it("starts over with an empty selection but remembers the name", async () => {
    const user = userEvent.setup();
    render(<App menu={testMenu} />);
    await user.type(screen.getByLabelText(/your name/i), "Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    await user.click(screen.getByRole("checkbox", { name: /ham/i }));
    await user.click(screen.getByRole("button", { name: /review/i }));
    await user.click(screen.getByRole("button", { name: /start over/i }));
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Henrik");
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    expect(screen.getByRole("checkbox", { name: /ham/i })).not.toBeChecked();
  });

  it("sends a Yes to making your own pizza", async () => {
    const user = userEvent.setup();
    render(<App menu={testMenu} />);
    await user.type(screen.getByLabelText(/your name/i), "Anna");
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: /pick toppings/i }));
    await user.click(screen.getByRole("checkbox", { name: /ham/i }));
    await user.click(screen.getByRole("button", { name: /review/i }));
    const link = screen.getByRole("link", { name: /send to baker bob/i });
    const text = new URL(link.getAttribute("href")!).searchParams.get("text")!;
    expect(text).toContain("🧑‍🍳 Make my own pizza: Yes");
    expect(text).not.toContain("Comment");
  });
});
