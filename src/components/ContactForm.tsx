"use client";

import { useEffect, useId, useRef, useState } from "react";
import { contactForm as copy, links } from "@/content";

/** Web3Forms' own public hCaptcha site key — their free, documented
 *  integration: the captcha is verified by Web3Forms, so the site needs
 *  no captcha secret of its own. */
const HCAPTCHA_SITEKEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";
const ENDPOINT = "https://api.web3forms.com/submit";
const KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "";

type Status = "idle" | "sending" | "sent" | "failed" | "captcha";

interface HCaptcha {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  reset(id?: string): void;
}

/**
 * The close's form. Hairline fields in the site's own grammar — no filled
 * boxes, no new colour — so it reads as part of the record, not a
 * widget dropped onto it.
 *
 * Spam: a honeypot (`botcheck`, off-screen, never focusable) always, and
 * hCaptcha whenever the form can actually send. The captcha script is
 * third-party, so it is fetched only once someone starts writing — a
 * reader who never touches the form never contacts hCaptcha.
 *
 * Without an access key (a fork, a local build) the form composes the
 * same message in the visitor's mail app and says so beside the button.
 */
export default function ContactForm() {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef("");
  const armed = useRef(false);

  const arm = () => {
    if (!KEY || armed.current) return;
    armed.current = true;
    const w = window as unknown as { hcaptcha?: HCaptcha; __lampHc?: () => void };
    const render = () => {
      if (!box.current || !w.hcaptcha || widget.current) return;
      widget.current = w.hcaptcha.render(box.current, {
        sitekey: HCAPTCHA_SITEKEY,
        theme: "dark",
        callback: (t: string) => {
          token.current = t;
          setStatus((s) => (s === "captcha" ? "idle" : s));
        },
        "expired-callback": () => {
          token.current = "";
        },
      });
    };
    if (w.hcaptcha) return render();
    w.__lampHc = render;
    const s = document.createElement("script");
    s.src = "https://js.hcaptcha.com/1/api.js?render=explicit&onload=__lampHc&recaptchacompat=off";
    s.async = true;
    document.head.appendChild(s);
  };

  useEffect(() => {
    if (!KEY) return;
    const form = box.current?.closest("form");
    if (!form) return;
    form.addEventListener("focusin", arm, { once: true });
    return () => form.removeEventListener("focusin", arm);
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    if (data.get("botcheck")) return; // a bot filled the honeypot
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const message = String(data.get("message") ?? "");

    if (!KEY) {
      const body = `${message}\n\n— ${name} <${email}>`;
      window.location.href = `mailto:${links.email}?subject=${encodeURIComponent(
        `${copy.subject} — ${name}`,
      )}&body=${encodeURIComponent(body)}`;
      return;
    }
    if (!token.current) {
      arm();
      setStatus("captcha");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: KEY,
          subject: `${copy.subject} — ${name}`,
          from_name: name,
          name,
          email,
          message,
          "h-captcha-response": token.current,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (res.ok && json.success) {
        setStatus("sent");
        formEl.reset();
      } else {
        setError(json.message ?? "");
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    } finally {
      token.current = "";
      const w = window as unknown as { hcaptcha?: HCaptcha };
      if (widget.current) w.hcaptcha?.reset(widget.current);
    }
  };

  const field = "contact-field mt-2 block w-full bg-transparent font-mono text-base";
  return (
    <form onSubmit={onSubmit} className="contact-form mt-12 max-w-[40rem]" noValidate={false}>
      <h3 className="label border-b border-rule pb-2">{copy.heading}</h3>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block" htmlFor={`${id}-name`}>
          <span className="label">{copy.name}</span>
          <input id={`${id}-name`} name="name" required autoComplete="name" maxLength={120} className={field} />
        </label>
        <label className="block" htmlFor={`${id}-email`}>
          <span className="label">{copy.email}</span>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            className={field}
          />
        </label>
      </div>
      <label className="mt-6 block" htmlFor={`${id}-message`}>
        <span className="label">{copy.message}</span>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          rows={5}
          maxLength={5000}
          className={`${field} resize-y`}
        />
      </label>
      {/* Honeypot: people never see or reach it; bots fill everything. */}
      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: "none" }}
      />
      {KEY && <div ref={box} className="mt-6 min-h-[78px]" />}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="contact-send label border border-signal bg-signal px-4 py-3 text-ground transition-colors hover:bg-transparent hover:text-signal"
        >
          {status === "sending" ? copy.sending : copy.send}
        </button>
        {!KEY && <p className="text-sm">{copy.mailFallback}</p>}
      </div>
      <p role="status" aria-live="polite" className="mt-4 min-h-[1.5em] text-sm">
        {status === "sent" && copy.sent}
        {status === "captcha" && copy.captcha}
        {status === "failed" && (
          <>
            {copy.failed}{" "}
            <a href={`mailto:${links.email}`} className="underline decoration-rule underline-offset-4">
              {links.email}
            </a>
            {error ? ` (${error})` : ""}
          </>
        )}
      </p>
      {!KEY && <div ref={box} hidden />}
    </form>
  );
}
