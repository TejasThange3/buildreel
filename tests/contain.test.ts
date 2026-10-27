import { describe, expect, it } from "vitest";
import { containRect } from "@/lib/render/contain";

describe("containRect", () => {
  it("fills a frame of the same shape", () => {
    expect(containRect(1920, 1080, 1280, 720)).toEqual([0, 0, 1280, 720]);
  });

  it("letterboxes a 16:10 recording in a 16:9 frame", () => {
    expect(containRect(1440, 900, 1600, 900)).toEqual([80, 0, 1440, 900]);
  });

  it("pillarboxes nothing and centres vertically for a wider source", () => {
    expect(containRect(2560, 1080, 1280, 720)).toEqual([0, 90, 1280, 540]);
  });
});
