import type { IStyleData } from "@univerjs/presets";

export const styles: Record<string, IStyleData> = {
  // Light header (original)
  hdr: {
    bg: { rgb: "#5CCCCC" },
    cl: { rgb: "#000000" },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    },
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
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    },
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
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    },
  },
  id: {
    cl: { rgb: "#FFFFFF" },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#FFFFFF" } },
      b: { s: 1, cl: { rgb: "#FFFFFF" } },
      r: { s: 1, cl: { rgb: "#FFFFFF" } },
    },
  },
  lockedCol: {
    bg: { rgb: "#EEEEEE" },
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    }
  },
  lockedRow: {
    bg: { rgb: "#EEEEEE" },
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    }
  },
};
