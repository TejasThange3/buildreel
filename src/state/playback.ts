import { create } from "zustand";

// The playhead moves every frame. Components that follow it subscribe outside React
// (usePlayback.subscribe) and write to the DOM directly instead of re-rendering at 60 fps.
type Playback = {
  outT: number;
  playing: boolean;
  seek: (outT: number) => void;
  setPlaying: (playing: boolean) => void;
};

export const usePlayback = create<Playback>()((set) => ({
  outT: 0,
  playing: false,
  seek: (outT) => set({ outT }),
  setPlaying: (playing) => set({ playing }),
}));
