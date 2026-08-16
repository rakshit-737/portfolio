import type { EvidenceSegment } from "@/content";
import { creditOf, plates, type PlateId } from "@/lib/art";

/** Every act credits its painting on the same line as its evidence.
 *  Art is sourced the same way code is. */
export function withCredit(
  plateId: PlateId,
  segments: EvidenceSegment[],
): EvidenceSegment[] {
  const plate = plates[plateId];
  return [...segments, { label: creditOf(plate), href: plate.sourceUrl }];
}
