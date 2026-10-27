import { create } from "zustand";

// The playhead moves every frame. Components that follow it subscribe outside React
// (usePlayback.subscribe) and write to the DOM directly instead of re-rendering at 60 fps.
// `seek` is for people (timeline, step list) and bumps seekId so the player knows the video has
// to follow; `advance` is the player's own clock and does not.
type Playback = {
  outT: number;
  playing: boolean;
  seekId: number;
  seek: (outT: number) => void;
  advance: (outT: number) => void;
  setPlaying: (playing: boolean) => void;
};

export const usePlayback = create<Playback>()((set) => ({
  outT: 0,
  playing: false,
  seekId: 0,
  seek: (outT) => set((s) => ({ outT, seekId: s.seekId + 1 })),
  advance: (outT) => set({ outT }),
  setPlaying: (playing) => set({ playing }),
}));
