import { useState } from "react";
import type { Menu, Topping } from "../config/menu";
import { useLanguage } from "../i18n/useLanguage";
import { buildOrderMessage, buildWhatsAppUrl } from "../lib/whatsapp";
import { Button, LinkButton } from "./Button";
import { Shell } from "./Shell";

type Props = {
  menu: Menu;
  customerName: string;
  toppings: Topping[];
  onBack: () => void;
  onStartOver: () => void;
};

export function ReviewStep({ menu, customerName, toppings, onBack, onStartOver }: Props) {
  const { t, l, language } = useLanguage();
  const message = buildOrderMessage({ customerName, toppings, language });
  const url = buildWhatsAppUrl(menu.recipient.whatsappNumber, message);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Shell
      step={3}
      title={t.reviewTitle}
      subtitle={t.reviewSubtitle(l(menu.recipient.name))}
      footer={
        <div className="space-y-2">
          <LinkButton
            variant="whatsapp"
            className="w-full"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            {t.sendTo(l(menu.recipient.name))}
          </LinkButton>
          <Button variant="ghost" className="w-full" onClick={onBack}>
            ← {t.changeToppings}
          </Button>
        </div>
      }
    >
      <section
        aria-labelledby="summary-heading"
        className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10"
      >
        <h2
          id="summary-heading"
          className="text-xs font-semibold tracking-widest text-cream-300/60 uppercase"
        >
          {t.pizzaFor(customerName)}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {toppings.map((topping) => (
            <li
              key={topping.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-cheese-400/15 px-3 py-1.5 text-sm font-medium text-cheese-300 ring-1 ring-cheese-400/30"
            >
              <span aria-hidden="true">{topping.emoji}</span>
              {l(topping.name)}
            </li>
          ))}
        </ul>
      </section>

      <details className="group mt-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm text-cream-300/80 select-none">
          <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
            ▸
          </span>{" "}
          {t.previewMessage}
        </summary>
        <pre className="px-4 pb-4 font-sans text-sm whitespace-pre-wrap text-cream-100/90">
          {message}
        </pre>
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={copy}
            className="text-xs font-medium text-cheese-300 underline-offset-2 hover:underline"
          >
            {copied ? t.copied : t.copyMessage}
          </button>
        </div>
      </details>

      <button
        type="button"
        onClick={onStartOver}
        className="mt-6 text-sm text-cream-300/60 underline-offset-2 hover:underline"
      >
        {t.startOver}
      </button>
    </Shell>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 18.15a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.69 8.24-8.23 8.24m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28" />
    </svg>
  );
}
