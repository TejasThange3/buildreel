"use client";

import Link from "next/link";
import { useProject } from "@/state/store";
import { DropZone } from "./DropZone";

export default function Editor() {
  const hasProject = useProject((s) => s.recording !== undefined);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center border-b border-line px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Buildreel
        </Link>
      </header>
      <main className="flex flex-1 flex-col">{hasProject ? null : <DropZone />}</main>
    </div>
  );
}
