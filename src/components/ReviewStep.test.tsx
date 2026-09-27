import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildOrderMessage } from "../lib/whatsapp";
import { testMenu } from "../test/fixtures";
import { ReviewStep } from "./ReviewStep";

const toppings = [testMenu.toppings[0]!, testMenu.toppings[3]!];
const baseProps = {
  menu: testMenu,
  customerName: "Henrik",
  toppings,
  onBack: vi.fn(),
  onStartOver: vi.fn(),
};

describe("ReviewStep", () => {
  it("summarises the pizza", () => {
    render(<ReviewStep {...baseProps} />);
    expect(screen.getByRole("heading", { name: /pizza for henrik/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Mozzarella"),
        expect.stringContaining("Olives"),
      ]),
    );
  });

  it("links to WhatsApp with the recipient and the pre-filled message", () => {
    render(<ReviewStep {...baseProps} />);
    const link = screen.getByRole("link", { name: /send to baker bob/i });
    const href = new URL(link.getAttribute("href")!);
    expect(href.origin + href.pathname).toBe("https://wa.me/46701234567");
    expect(href.searchParams.get("text")).toBe(
      buildOrderMessage({ customerName: "Henrik", toppings }),
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("previews the message and copies it", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ReviewStep {...baseProps} />);
    expect(screen.getByText(/pizza order from henrik/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /copy message/i }));
    expect(writeText).toHaveBeenCalledWith(buildOrderMessage({ customerName: "Henrik", toppings }));
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("stays calm when the clipboard is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
      configurable: true,
    });
    render(<ReviewStep {...baseProps} />);
    await user.click(screen.getByRole("button", { name: /copy message/i }));
    expect(screen.getByRole("button", { name: /copy message/i })).toBeInTheDocument();
  });

  it("navigates back and starts over", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onStartOver = vi.fn();
    render(<ReviewStep {...baseProps} onBack={onBack} onStartOver={onStartOver} />);
    await user.click(screen.getByRole("button", { name: /change toppings/i }));
    expect(onBack).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /start over/i }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
