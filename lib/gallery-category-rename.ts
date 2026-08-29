import {
  CURRENT_GALLERY_CATEGORY,
  LEGACY_GALLERY_CATEGORY,
} from "@/lib/gallery-terminology";

export type GalleryCategoryRenameCandidate = {
  id: string;
  title: string;
  category: string;
};

export function selectGalleryCategoryRenameCandidates(
  records: GalleryCategoryRenameCandidate[],
) {
  return records.filter(
    (record) => record.category === LEGACY_GALLERY_CATEGORY,
  );
}

export const galleryCategoryRename = {
  from: LEGACY_GALLERY_CATEGORY,
  to: CURRENT_GALLERY_CATEGORY,
} as const;
