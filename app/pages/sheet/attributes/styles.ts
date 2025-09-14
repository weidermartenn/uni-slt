import type { IStyleData } from "@univerjs/presets";

export const styles: Record<string, IStyleData> = {
    hdr: {
        bg: { rgb: "#5CCCCC" },
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
        },
        bd: {
            l: { s: 1, cl: { rgb: "#000000" } },
            t: { s: 1, cl: { rgb: "#000000" } },
            b: { s: 1, cl: { rgb: "#000000" } },
            r: { s: 1, cl: { rgb: "#000000" } },
        }
    }
}