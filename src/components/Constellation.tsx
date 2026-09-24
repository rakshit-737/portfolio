"use client";

import { useEffect, useRef } from "react";
import { experience } from "@/content";
import type { SkillGroup } from "@/lib/skills";

export type { SkillGroup };

/**
 * The ledger's skills as a constellation. Server-rendered as the same
 * plain list it always was — a `dl` of groups and text chips, so find-in-
 * page and a no-JS reader lose nothing — then drawn over on the client:
 * a hairline from each group's hub to each of its skills, and, when a
 * skill is hovered, chords to every other skill named by the same
 * project, those skills lit (the local bone swap), and a readout of the
 * projects that list it. The mapping is exact names from the projects'
 * own `tech` lists (src/lib/skills.ts) — nothing inferred.
 *
 * The chips drift a few pixels toward the pointer by a per-chip depth, so
 * the field reads as layered; the drawing never animates on its own.
 */
export default function Constellation({ groups }: { groups: SkillGroup[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = ref.current;
    const lines = svg.current;
    if (!root || !lines) return;
    const NS = "http://www.w3.org/2000/svg";
    let chips: HTMLElement[] = [];

    const draw = () => {
      const box = root.getBoundingClientRect();
      lines.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      lines.replaceChildren();
      chips = Array.from(root.querySelectorAll<HTMLElement>("[data-skill]"));
      for (const hub of root.querySelectorAll<HTMLElement>("[data-hub]")) {
        const h = hub.getBoundingClientRect();
        const hx = h.left - box.left + 3;
        const hy = h.top - box.top + h.height / 2;
        const group = hub.closest("[data-group]");
        for (const chip of group?.querySelectorAll<HTMLElement>("[data-skill]") ?? []) {
          const c = chip.getBoundingClientRect();
          const cx = c.left - box.left + c.width / 2;
          const cy = c.top - box.top;
          const path = document.createElementNS(NS, "path");
          path.setAttribute("d", `M${hx} ${hy} L${hx} ${cy - 6} L${cx} ${cy - 6} L${cx} ${cy}`);
          path.setAttribute("class", "cst-edge");
          path.dataset.for = chip.dataset.skill;
          lines.appendChild(path);
        }
      }
    };

    const light = (chip: HTMLElement | null) => {
      for (const c of chips) c.removeAttribute("data-lit");
      for (const p of lines.querySelectorAll(".cst-chord")) p.remove();
      for (const p of lines.querySelectorAll<SVGPathElement>(".cst-edge")) p.removeAttribute("data-lit");
      if (!chip) {
        if (readout.current) readout.current.textContent = "";
        return;
      }
      const used = (chip.dataset.used ?? "").split("|").filter(Boolean);
      chip.setAttribute("data-lit", "");
      lines.querySelector<SVGPathElement>(`.cst-edge[data-for="${CSS.escape(chip.dataset.skill ?? "")}"]`)?.setAttribute("data-lit", "");
      const box = root.getBoundingClientRect();
      const a = chip.getBoundingClientRect();
      const ax = a.left - box.left + a.width / 2;
      const ay = a.top - box.top + a.height / 2;
      for (const other of chips) {
        if (other === chip) continue;
        const ou = (other.dataset.used ?? "").split("|");
        if (!used.some((u) => ou.includes(u))) continue;
        other.setAttribute("data-lit", "");
        const b = other.getBoundingClientRect();
        const bx = b.left - box.left + b.width / 2;
        const by = b.top - box.top + b.height / 2;
        const mx = (ax + bx) / 2;
        const my = Math.min(ay, by) - 40 - Math.abs(ax - bx) * 0.08;
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", `M${ax} ${ay} Q${mx} ${my} ${bx} ${by}`);
        path.setAttribute("class", "cst-chord");
        lines.appendChild(path);
      }
      if (readout.current) {
        readout.current.textContent = used.length
          ? `${chip.dataset.skill} — ${experience.constellation.listedIn}: ${used.join(" · ")}`
          : `${chip.dataset.skill} — ${experience.constellation.unlisted}`;
      }
    };

    const onOver = (e: PointerEvent) => {
      const chip = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-skill]") : null;
      light(chip);
    };
    const onLeave = () => light(null);
    const onFocus = (e: FocusEvent) => {
      light(e.target instanceof HTMLElement ? e.target.closest<HTMLElement>("[data-skill]") : null);
    };
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: PointerEvent) => {
      if (!fine || still || document.documentElement.getAttribute("data-fx") === "off") return;
      const box = root.getBoundingClientRect();
      const nx = (e.clientX - box.left) / box.width - 0.5;
      const ny = (e.clientY - box.top) / box.height - 0.5;
      root.style.setProperty("--cx", nx.toFixed(3));
      root.style.setProperty("--cy", ny.toFixed(3));
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(root);
    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onLeave);
    root.setAttribute("data-drawn", "");
    return () => {
      ro.disconnect();
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="constellation">
      <svg ref={svg} className="cst-lines" aria-hidden="true" />
      <dl className="mt-4 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {groups.map(({ group, items }) => (
          <div key={group} data-group="">
            <dt className="label flex items-center gap-2">
              <span data-hub="" aria-hidden="true" className="cst-hub" />
              {group}
            </dt>
            <dd className="mt-4 pl-3">
              <ul className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                  <li
                    key={item.name}
                    data-skill={item.name}
                    data-used={item.usedIn.join("|")}
                    className="cst-chip label border border-rule px-2.5 py-1.5 normal-case"
                    style={{ "--d": ((i * 37) % 7) / 7 + 0.3 } as React.CSSProperties}
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
      <p ref={readout} className="cst-readout label normal-case" aria-hidden="true" />
    </div>
  );
}
