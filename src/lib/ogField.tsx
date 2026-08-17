/**
 * Shared palette and marks for the OG cards. Satori (which powers
 * `ImageResponse`) does not support CSS masks, so the social cards can
 * never carry the lamp — they render flat instead: the ground colour,
 * bone type, and a single ember rule, the same three tokens the lit site
 * uses, minus the light.
 */
export const OG_GROUND = "#08070A";
export const OG_BONE = "#F2EDE3";
export const OG_EMBER = "#E8A33D";

/**
 * The provenance chip: bone ground, ground text — the same inversion
 * `Provenance` draws for a passing chip on the live page. Ember is reserved
 * for the card's single rule; a chip is prose, so it never carries it.
 */
export function OgChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "flex",
        backgroundColor: OG_BONE,
        color: OG_GROUND,
        padding: "4px 10px",
      }}
    >
      {children}
    </span>
  );
}
