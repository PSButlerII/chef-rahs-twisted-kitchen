"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  menuItemId: string;
  itemName: string;
};

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function DeleteMenuItemButton({ menuItemId, itemName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteItem() {
    const confirmed = confirm(
      `Permanently delete "${itemName}"? Historical orders keep their saved item snapshots, but this menu item and its options will be removed.`,
    );

    if (!confirmed) return;

    setDeleting(true);

    const response = await fetch(`/api/admin/menu/${menuItemId}`, {
      method: "DELETE",
    });

    setDeleting(false);

    if (!response.ok) {
      alert(await readError(response, "Failed to delete menu item."));
      return;
    }

    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1"><span className="text-xs font-bold text-red-800">Permanent Delete cannot be undone. Use Archive when the item may be needed again.</span><button
      type="button"
      onClick={deleteItem}
      disabled={deleting}
      className="admin-button-danger text-xs"
    >
      {deleting ? "Deleting..." : "Delete Item"}
    </button></span>
  );
}
