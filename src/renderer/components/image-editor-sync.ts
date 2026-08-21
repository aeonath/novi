/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Plans create/destroy/show for per-tab image editors. Switching the active
 * image tab must not destroy the others — that was wiping every open image.
 */

export interface ImageTabRef {
  id: string;
  filePath: string;
}

export interface ImageEditorSyncPlan {
  toCreate: ImageTabRef[];
  toDestroy: string[];
  activeId: string | null;
}

export function planImageEditorSync(
  openTabs: ImageTabRef[],
  existingIds: Iterable<string>,
  activeTabId: string | null | undefined,
  activeTabType: string | null | undefined,
): ImageEditorSyncPlan {
  const validTabs = openTabs.filter(t => !!t.id && !!t.filePath);
  const openIds = new Set(validTabs.map(t => t.id));
  const existing = [...existingIds];
  return {
    toCreate: validTabs.filter(t => !existing.includes(t.id)),
    toDestroy: existing.filter(id => !openIds.has(id)),
    activeId: activeTabType === 'image' ? (activeTabId ?? null) : null,
  };
}
