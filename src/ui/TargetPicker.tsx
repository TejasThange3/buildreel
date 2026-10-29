"use client";

import { useProject } from "@/state/store";
import { Segmented } from "./Segmented";

const TARGETS = [30, 60, 90];

export function TargetPicker() {
  const targetS = useProject((s) => s.constraints.targetS);
  const setTarget = useProject((s) => s.setTarget);

  // A steered length such as 45 s has no button, so none is checked until one is picked.
  return (
    <Segmented
      label="Reel length"
      options={TARGETS.map((s) => ({ value: s, label: `${s}s` }))}
      value={targetS}
      onChange={setTarget}
      mono
    />
  );
}
