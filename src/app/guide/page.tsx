import type { Metadata } from "next";
import { Guide } from "@/ui/guide/Guide";

export const metadata: Metadata = {
  title: "Guide · Buildreel",
  description: "Record your build, find your two files, line them up and export your reel.",
};

export default function GuidePage() {
  return <Guide />;
}
