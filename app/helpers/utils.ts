// helpers/utils.ts

export const unwrapV = (x: any): any =>
  x && typeof x === "object" && "v" in x ? unwrapV(x.v) : x

export const toStr = (raw: any): string => {
  const val = unwrapV(raw)
  if (val == null) return ""
  if (typeof val === "object") {
    if (typeof val.t === "string") return val.t.trim()
    if (Array.isArray(val.p)) {
      return val.p.map((seg: any) => String(unwrapV(seg?.s?.v ?? seg))).join("").trim()
    }
    return ""
  }
  return String(val).trim()
}

export const normalizeDateInput = (raw: any): string | null => {
  const val = toStr(raw)
  const n = Number(val)

  if (Number.isFinite(n)) {
    if (n >= 25569) return excelSerialToISO(n)
    if (n > 1e12) return tsToISO(n)
    if (n > 1e10 && n < 1e12) return tsToISO(n * 1000)
  }

  const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return iso[0]
  const dot = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`
  const slash = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`

  const d = new Date(val)
  return Number.isFinite(d.getTime()) ? tsToISO(d.getTime()) : null
}

export const isNumericOrEmpty = (v: any): boolean => {
  if (v == null) return true
  const s = String(v).trim()
  if (!s) return true
  if (s.startsWith("#")) return false
  if (typeof v === "number") return Number.isFinite(v)
  return /^[-+]?\d+(?:\.\d+)?$/.test(s)
}

const excelSerialToISO = (n: number): string => {
  const baseMs = Date.UTC(1899, 11, 30)
  const ms = Math.round(n * 86400000)
  const d = new Date(baseMs + ms)
  return d.toISOString().slice(0, 10)
}

const tsToISO = (ms: number): string => {
  return new Date(ms).toISOString().slice(0, 10)
}
