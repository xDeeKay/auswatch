"use client";

import { useState } from "react";
import LocationPicker from "@/components/LocationPicker";
import type { LatLng } from "@/components/LocationPickerView";
import { CameraType, CaptureType } from "@/generated/prisma/enums";
import { TYPE_LABEL, CAPTURE_LABEL } from "@/lib/camera-labels";

const OPERATOR_SUGGESTIONS = [
  "WA Police",
  "NSW Police",
  "Victoria Police",
  "Queensland Police",
  "SA Police",
  "NT Police",
  "Local council",
  "State government",
  "Private operator",
  "Unknown",
];

const fieldLabel = "font-mono text-xs tracking-[0.05em] text-amber";
const inputClass =
  "w-full rounded border border-parchment/20 bg-transparent px-3 py-2 text-sm text-parchment placeholder:text-parchment/30 focus:border-amber focus:outline-none";

type SubmitState = "idle" | "submitting" | "done" | "error";

export default function SubmissionForm() {
  const [type, setType] = useState<CameraType | "">("");
  const [operator, setOperator] = useState("");
  const [captures, setCaptures] = useState<CaptureType | "">("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const canSubmit = type !== "" && captures !== "" && location !== null && state !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location || type === "" || captures === "") return;

    setState("submitting");
    setFieldErrors({});

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          type,
          operator,
          captures,
          notes,
        }),
      });

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
      <div className="rounded border border-amber/30 bg-amber/5 p-6">
        <p className="font-heading text-lg text-parchment">Submission received</p>
        <p className="mt-2 text-sm text-parchment/70">
          Thank you. Your report is now in the review queue. It will not appear on the
          public map unless a moderator verifies it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
            <option value="" disabled>
              Select a type
            </option>
            {Object.values(CameraType).map((t) => (
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
            <option value="" disabled>
              Select what it appears to capture
            </option>
            {Object.values(CaptureType).map((c) => (
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
        <label className={fieldLabel} htmlFor="operator">
          OPERATOR (IF KNOWN)
        </label>
        <input
          id="operator"
          list="operator-suggestions"
          className={inputClass}
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          placeholder="e.g. Local council, WA Police, Unknown"
          maxLength={120}
        />
        <datalist id="operator-suggestions">
          {OPERATOR_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

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
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel}>LOCATION</label>
        <div className="h-72 overflow-hidden rounded border border-parchment/20">
          <LocationPicker value={location} onChange={setLocation} />
        </div>
      </div>

      {state === "error" && (
        <p className="text-sm text-error">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === "submitting" ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
