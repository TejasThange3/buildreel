"use client";

import Link from "next/link";
import { useProject } from "@/state/store";
import { DropZone } from "./DropZone";
import { EditStage } from "./EditStage";
import { Logo } from "./Logo";
import { SyncPanel } from "./SyncPanel";

export default function Editor() {
  const hasProject = useProject((s) => s.recording !== undefined);
  const synced = useProject((s) => s.synced);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center border-b border-line px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col">
        {!hasProject ? <DropZone /> : !synced ? <SyncPanel /> : <EditStage />}
      </main>
    </div>
  );
}
