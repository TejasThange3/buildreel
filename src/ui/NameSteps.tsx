"use client";

import { useProject } from "@/state/store";
import { titlesRequest } from "@/state/titlesClient";

// Shown while some steps are still named by their first sentence.
export function NameSteps() {
  const wanted = useProject(
    (s) => titlesRequest(s.steps, s.constraints, s.autoTitles) !== undefined,
  );
  const naming = useProject((s) => s.naming);
  const nameSteps = useProject((s) => s.nameSteps);
  if (!wanted) return null;
  return (
    <button
      type="button"
      onClick={() => void nameSteps()}
      disabled={naming === "pending"}
      className="h-8 rounded-full border border-line-strong px-3.5 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
    >
      {naming === "pending" ? "Naming" : naming === "failed" ? "Try naming again" : "Name steps"}
    </button>
  );
}
