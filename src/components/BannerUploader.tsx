"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { Button } from "./ui";
import { useToast } from "./Toast";

export function BannerUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
      toast("Banner updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load image", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-text-primary">Banner image</span>

      <div className="overflow-hidden rounded-xl border border-card-border bg-background">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Current party banner preview"
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="grid h-40 place-items-center text-sm text-text-muted">
            No banner yet — upload one to display on screen.
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {value ? "Replace image" : "Upload image"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Images are compressed and stored on this device so they work offline.
      </p>
    </div>
  );
}
