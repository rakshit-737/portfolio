import { Fragment, type CSSProperties, type ReactNode } from "react";

/**
 * The display voice. One line per act, and no more than that.
 *
 * A string statement is split into words, each wrapped as `.word` with
 * its index in `--i`, so the act's one authored moment can resolve the
 * line word by word (globals.css, the `.statement .word` rules) — the
 * same beat the rest of the act's copy already lands on, not a second
 * animation. The split is on plain spaces only: the heading's accessible
 * name is unchanged (the spaces stay as real text between the spans),
 * `text-wrap: balance` still sees one line of inline content, and a
 * non-string child (none today) renders exactly as before.
 */
export default function Statement({
  children,
  id,
  as: Tag = "h2",
  className = "",
}: {
  children: ReactNode;
  id?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  const content =
    typeof children === "string"
      ? children.split(" ").map((word, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span className="word" style={{ "--i": i } as CSSProperties}>
              {word}
            </span>
          </Fragment>
        ))
      : children;
  return (
    <Tag id={id} className={`statement ${className}`.trim()}>
      {content}
    </Tag>
  );
}
