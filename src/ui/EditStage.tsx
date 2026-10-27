"use client";

import { Player } from "./Player";
import { StepList } from "./StepList";
import { TargetPicker } from "./TargetPicker";
import { Timeline } from "./Timeline";

export function EditStage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-8">
      <div className="flex min-w-0 flex-col gap-5">
        <Player />
        <Timeline />
      </div>
      <aside className="flex min-w-0 flex-col gap-5 lg:border-l lg:border-line lg:pl-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Reel length</h2>
          <TargetPicker />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium">Steps</h2>
          <StepList />
        </div>
      </aside>
    </div>
  );
}
