"use client";

import Link from "next/link";
import { useProject } from "@/state/store";
import { DropZone } from "./DropZone";
import { Player } from "./Player";
import { SyncPanel } from "./SyncPanel";

export default function Editor() {
  const hasProject = useProject((s) => s.recording !== undefined);
  const synced = useProject((s) => s.synced);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center border-b border-line px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Buildreel
        </Link>
      </header>
      <main className="flex flex-1 flex-col">
        {!hasProject ? (
          <DropZone />
        ) : !synced ? (
          <SyncPanel />
        ) : (
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <Player />
          </div>
        )}
      </main>
    </div>
  );
}
