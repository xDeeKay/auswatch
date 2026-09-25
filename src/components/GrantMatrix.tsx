"use client";

import { useRef } from "react";
import { AuState, CameraType } from "@/generated/prisma/enums";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { TYPE_LABEL } from "@/lib/camera-labels";
import { grantFieldName } from "@/lib/moderator-grants";

export type GrantMatrixDefaults = Partial<Record<string, { canView: boolean; canAct: boolean }>>;

function cellKey(state: AuState, cameraType: CameraType): string {
  return `${state}:${cameraType}`;
}

/**
 * Checking "Act" always checks "View" too, since a grant with canAct implies
 * canView. This is only a UI convenience: the save action re-derives canView
 * from canAct server-side regardless of what gets submitted here.
 */
export function GrantMatrix({ defaults = {} }: { defaults?: GrantMatrixDefaults }) {
  const viewRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const actRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setRow(state: AuState, axis: "view" | "act", checked: boolean) {
    for (const cameraType of Object.values(CameraType)) {
      const key = cellKey(state, cameraType);
      const viewInput = viewRefs.current[key];
      const actInput = actRefs.current[key];
      if (axis === "view") {
        if (viewInput) viewInput.checked = checked;
        if (!checked && actInput) actInput.checked = false;
      } else {
        if (actInput) actInput.checked = checked;
        if (checked && viewInput) viewInput.checked = true;
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded border border-foreground/10">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left font-label text-xs text-amber">
            <th className="p-2">STATE/TERRITORY</th>
            {Object.values(CameraType).map((cameraType) => (
              <th key={cameraType} className="p-2 text-center">
                {TYPE_LABEL[cameraType]}
              </th>
            ))}
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {Object.values(AuState).map((state) => (
            <tr key={state} className="border-t border-foreground/10">
              <td className="p-2 text-foreground/85">{STATE_LABEL[state]}</td>
              {Object.values(CameraType).map((cameraType) => {
                const key = cellKey(state, cameraType);
                const cellDefaults = defaults[key];
                return (
                  <td key={key} className="p-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <label className="flex items-center gap-1 font-label text-[10px] text-foreground/60">
                        <input
                          ref={(el) => {
                            viewRefs.current[key] = el;
                          }}
                          type="checkbox"
                          name={grantFieldName(state, cameraType, "view")}
                          defaultChecked={cellDefaults?.canView ?? false}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              const actInput = actRefs.current[key];
                              if (actInput) actInput.checked = false;
                            }
                          }}
                        />
                        View
                      </label>
                      <label className="flex items-center gap-1 font-label text-[10px] text-foreground/60">
                        <input
                          ref={(el) => {
                            actRefs.current[key] = el;
                          }}
                          type="checkbox"
                          name={grantFieldName(state, cameraType, "act")}
                          defaultChecked={cellDefaults?.canAct ?? false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const viewInput = viewRefs.current[key];
                              if (viewInput) viewInput.checked = true;
                            }
                          }}
                        />
                        Act
                      </label>
                    </div>
                  </td>
                );
              })}
              <td className="p-2">
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={() => setRow(state, "act", true)}
                    className="font-label text-[10px] text-foreground/50 underline decoration-amber/50 underline-offset-2 hover:text-amber"
                  >
                    All act
                  </button>
                  <button
                    type="button"
                    onClick={() => setRow(state, "view", false)}
                    className="font-label text-[10px] text-foreground/50 underline decoration-amber/50 underline-offset-2 hover:text-amber"
                  >
                    Clear row
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
