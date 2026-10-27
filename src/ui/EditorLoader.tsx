"use client";

import dynamic from "next/dynamic";

// Mediabunny and WebCodecs exist only in the browser, so the editor never renders on the server.
const Editor = dynamic(() => import("./Editor"), { ssr: false });

export function EditorLoader() {
  return <Editor />;
}
