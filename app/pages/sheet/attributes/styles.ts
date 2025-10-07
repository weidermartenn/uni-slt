import type { IStyleData } from "@univerjs/presets";

export const styles: Record<string, IStyleData> = {
  // Light header (original)
  hdr: {
    bg: { rgb: "#75D54C" },
    cl: { rgb: "#000000" },
    tb: 3,
    ht: 1,
    vt: 2,
    fs: 12,
    pd: {
      l: 4,
    },
  },
  // Dark header
  hdrDark: {
    bg: { rgb: "#44AA18" },
    cl: { rgb: "#FFFFFF" },
    tb: 3,
    ht: 1,
    vt: 2,
    fs: 12,
    pd: {
      l: 4,
    },
  },
  ar: {
    tb: 2,
    vt: 2,
    pd: {
      l: 4,
      r: 4
    },
  },
  id: {
    cl: { rgb: "#FFFFFF" },
  },
  lockedCol: {
    bg: { rgb: "#CCCCCC" },
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#DDDDDD" } },
      t: { s: 1, cl: { rgb: "#DDDDDD" } },
      b: { s: 1, cl: { rgb: "#DDDDDD" } },
      r: { s: 1, cl: { rgb: "#DDDDDD" } },
    },
  },
  lockedRow: {
    bg: { rgb: "#EEEEEE" },
    vt: 2,
    pd: {
      l: 4,
    },
  },
};
