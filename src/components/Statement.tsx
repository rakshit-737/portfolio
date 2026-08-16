import type { ReactNode } from "react";

/** The display voice. One line per act, and no more than that. */
export default function Statement({
  children,
  id,
  as: Tag = "h2",
}: {
  children: ReactNode;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag id={id} className="statement">
      {children}
    </Tag>
  );
}
