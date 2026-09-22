"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PHOTOS_PER_SUBMISSION, MAX_UPLOAD_BYTES, ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/photo-limits";

const fieldLabel = "font-label text-xs text-amber";
const ACCEPT = ALLOWED_PHOTO_CONTENT_TYPES.join(",");

/**
 * Advisory only - the server independently re-validates count, type, and
 * size, and is the sole authority on what actually gets accepted.
 */
export function PhotoPicker({
  photos,
  onChange,
  error,
}: {
  photos: File[];
  onChange: (photos: File[]) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [localWarning, setLocalWarning] = useState<string | null>(null);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [photos]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const combined = [...photos, ...incoming];

    if (combined.length > MAX_PHOTOS_PER_SUBMISSION) {
      setLocalWarning(`You can attach at most ${MAX_PHOTOS_PER_SUBMISSION} photos.`);
      onChange(combined.slice(0, MAX_PHOTOS_PER_SUBMISSION));
    } else if (incoming.some((f) => f.size > MAX_UPLOAD_BYTES)) {
      setLocalWarning("Each photo must be 8MB or smaller.");
      onChange(combined.filter((f) => f.size <= MAX_UPLOAD_BYTES));
    } else {
      setLocalWarning(null);
      onChange(combined);
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(index: number) {
    setLocalWarning(null);
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={fieldLabel}>PHOTO EVIDENCE (OPTIONAL)</label>
      <p className="text-xs text-parchment/50">
        Up to {MAX_PHOTOS_PER_SUBMISSION} photos of the camera itself, from a public place. Helps a
        moderator verify the report. Never shown publicly unless a moderator approves it.
      </p>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((url, i) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded border border-parchment/20">
              {/* eslint-disable-next-line @next/next/no-img-element -- transient client-side blob preview, not a next/image candidate */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-0 top-0 bg-ink/80 px-1.5 py-0.5 font-label text-xs text-parchment hover:text-error"
                aria-label="Remove photo"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < MAX_PHOTOS_PER_SUBMISSION && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm text-parchment/70 file:mr-3 file:rounded file:border file:border-parchment/20 file:bg-transparent file:px-3 file:py-1.5 file:font-label file:text-xs file:text-amber"
        />
      )}

      {localWarning && <p className="text-xs text-error">{localWarning}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
