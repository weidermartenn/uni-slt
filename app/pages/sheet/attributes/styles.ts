import type { IStyleData } from "@univerjs/presets";

export const styles: Record<string, IStyleData> = {
  // Light header (original)
  hdr: {
    bg: { rgb: "#5CCCCC" },
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
    bg: { rgb: "#2C7A7B" },
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
    bg: { rgb: "#EEEEEE" },
    vt: 2,
    pd: {
      l: 4,
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
