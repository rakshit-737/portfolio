import BarField from "@/components/BarField";

/**
 * A section opens the way a channel opens in this world: a title, a rule
 * that runs to the edge as a bar field, and — when there is one — a
 * measurement of what the section contains. No eyebrows, no numbering:
 * the heading carries itself.
 */
export default function SectionHead({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-end gap-5 border-b border-rule pb-3">
      <h2
        id={`${id}-title`}
        className="font-mono text-xl leading-none font-semibold tracking-[-0.03em] sm:text-2xl"
      >
        {title}
      </h2>
      <BarField
        seed={`head-${id}`}
        density={0.55}
        height={16}
        className="hidden h-4 min-w-0 grow opacity-55 sm:block"
      />
      {meta && (
        <p className="label ml-auto shrink-0 sm:ml-0">{meta}</p>
      )}
    </div>
  );
}
