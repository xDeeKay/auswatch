"use client";

import { useState } from "react";
import LocationPicker from "@/components/LocationPicker";
import type { LatLng } from "@/components/LocationPickerView";
import { CameraType, CaptureType, OperatorCategory } from "@/generated/prisma/enums";
import { TYPE_LABEL, TYPE_ORDER, CAPTURE_LABEL, CAPTURE_ORDER, OPERATOR_CATEGORY_LABEL, OPERATOR_NAME_PROMPT } from "@/lib/camera-labels";
import type { CorrectableCamera } from "@/lib/cameras";
import { PhotoPicker } from "@/components/PhotoPicker";

const fieldLabel = "font-label text-xs text-amber";
const inputClass =
  "w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-amber focus:outline-none";

type SubmitState = "idle" | "submitting" | "done" | "error";

export default function CorrectionForm({ camera }: { camera: CorrectableCamera }) {
  const [type, setType] = useState<CameraType>(camera.type);
  const [operatorCategory, setOperatorCategory] = useState<OperatorCategory>(camera.operatorCategory);
  const [operator, setOperator] = useState(camera.operator);
  const [captures, setCaptures] = useState<CaptureType>(camera.captures);
  const [notes, setNotes] = useState(camera.notes);
  const [location, setLocation] = useState<LatLng | null>({ lat: camera.lat, lng: camera.lng });
  const [reportedRemoved, setReportedRemoved] = useState(false);
  const [reporterNote, setReporterNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [state, setState] = useState<SubmitState>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const namePrompt = OPERATOR_NAME_PROMPT[operatorCategory];

  const canSubmit = location !== null && state !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return;

    setState("submitting");
    setFieldErrors({});

    try {
      const formData = new FormData();
      formData.set(
        "payload",
        JSON.stringify({
          cameraId: camera.id,
          lat: location.lat,
          lng: location.lng,
          type,
          operatorCategory,
          operator,
          captures,
          notes,
          reportedRemoved,
          reporterNote,
        })
      );
      for (const photo of photos) formData.append("photo", photo);

      const res = await fetch("/api/corrections", { method: "POST", body: formData });

      if (res.status === 400) {
        const body = await res.json();
        setFieldErrors(body.errors ?? {});
        setState("idle");
        return;
      }

      if (!res.ok) {
        setState("error");
        return;
      }

      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-xl rounded border border-amber/30 bg-amber/5 p-6">
        <p className="font-heading text-lg text-foreground">Correction received</p>
        <p className="mt-2 text-sm text-foreground/70">
          Thank you. Your proposed correction is now in the review queue. It will not
          change the public map unless a moderator approves it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabel} htmlFor="type">
            TYPE
          </label>
          <select
            id="type"
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as CameraType)}
            required
          >
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          {fieldErrors.type && <p className="text-xs text-error">{fieldErrors.type[0]}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabel} htmlFor="captures">
            APPEARS TO CAPTURE
          </label>
          <select
            id="captures"
            className={inputClass}
            value={captures}
            onChange={(e) => setCaptures(e.target.value as CaptureType)}
            required
          >
            {CAPTURE_ORDER.map((c) => (
              <option key={c} value={c}>
                {CAPTURE_LABEL[c]}
              </option>
            ))}
          </select>
          {fieldErrors.captures && (
            <p className="text-xs text-error">{fieldErrors.captures[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="operatorCategory">
          OPERATOR CATEGORY
        </label>
        <select
          id="operatorCategory"
          className={inputClass}
          value={operatorCategory}
          onChange={(e) => setOperatorCategory(e.target.value as OperatorCategory)}
          required
        >
          {Object.values(OperatorCategory).map((c) => (
            <option key={c} value={c}>
              {OPERATOR_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        {fieldErrors.operatorCategory && (
          <p className="text-xs text-error">{fieldErrors.operatorCategory[0]}</p>
        )}
      </div>

      {namePrompt && (
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabel} htmlFor="operator">
            {namePrompt.label}
          </label>
          <input
            id="operator"
            className={inputClass}
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder={namePrompt.placeholder}
            maxLength={120}
          />
          {fieldErrors.operator && <p className="text-xs text-error">{fieldErrors.operator[0]}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="notes">
          NOTES
        </label>
        <textarea
          id="notes"
          className={`${inputClass} min-h-24`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Describe what's visible from a public place. Avoid naming individuals or specific businesses."
        />
        {fieldErrors.notes && <p className="text-xs text-error">{fieldErrors.notes[0]}</p>}
      </div>

      <label className="flex items-start gap-3 rounded border border-foreground/20 px-3 py-2.5 text-sm text-foreground/85">
        <input
          type="checkbox"
          checked={reportedRemoved}
          onChange={(e) => setReportedRemoved(e.target.checked)}
          className="mt-0.5 accent-amber"
        />
        <span>
          This camera is no longer there. It&rsquo;s been taken down, relocated, or otherwise
          removed since it was last confirmed.
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel}>LOCATION</label>
        <div className="h-72 overflow-hidden rounded border border-foreground/20">
          <LocationPicker value={location} onChange={setLocation} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="reporterNote">
          WHAT&apos;S WRONG (OPTIONAL)
        </label>
        <textarea
          id="reporterNote"
          className={inputClass}
          value={reporterNote}
          onChange={(e) => setReporterNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. Marker is a block off, this is actually a council CCTV camera, not ALPR"
        />
        {fieldErrors.reporterNote && (
          <p className="text-xs text-error">{fieldErrors.reporterNote[0]}</p>
        )}
      </div>

      <PhotoPicker photos={photos} onChange={setPhotos} error={fieldErrors.photos?.[0]} />

      {state === "error" && (
        <p className="text-sm text-error">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded border border-amber bg-amber/10 px-4 py-2 font-label text-sm text-amber transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === "submitting" ? "Submitting…" : "Submit correction"}
      </button>
    </form>
  );
}
