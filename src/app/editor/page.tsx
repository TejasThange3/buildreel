import type { Metadata } from "next";
import { EditorLoader } from "@/ui/EditorLoader";

export const metadata: Metadata = { title: "Editor · Buildreel" };

export default function EditorPage() {
  return <EditorLoader />;
}
