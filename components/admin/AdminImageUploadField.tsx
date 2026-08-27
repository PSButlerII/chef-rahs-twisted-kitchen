"use client";

import Image from "next/image";
import { useId, useState } from "react";

type Props = {
  label?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  context:
    | "menu-item"
    | "weekly-offering"
    | "option-choice"
    | "gallery"
    | "general";
  onUploadingChange?: (uploading: boolean) => void;
};

export function AdminImageUploadField({
  label = "Image",
  name = "imageUrl",
  value,
  onChange,
  context,
  onUploadingChange,
}: Props) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setError("");
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("context", context);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: data,
      });
      const result = (await response.json().catch(() => null)) as {
        publicUrl?: string;
        error?: string;
      } | null;
      if (!response.ok || !result?.publicUrl)
        throw new Error(result?.error ?? "Image upload failed.");
      onChange(result.publicUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed.",
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold" htmlFor={`${id}-url`}>
        {label}
      </label>
      {value && (
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-[#ead8c1] bg-[#fff8ee]">
          <Image
            src={value}
            alt={`${label} preview`}
            fill
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <input
        id={`${id}-file`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={`${id}-file`}
        className="admin-button-secondary inline-flex cursor-pointer px-4 py-2 text-xs"
      >
        {uploading ? "Uploading..." : "Choose Image"}
      </label>
      <input
        id={`${id}-url`}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Public image URL"
        className="admin-input"
        disabled={uploading}
      />
      <p className="text-xs text-[#6b5a50]">
        JPG, PNG, or WebP; maximum 5 MB. You may also paste a public image URL.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
