import type { FUniver } from "@univerjs/presets";
import type { FWorksheet } from "@univerjs/presets/lib/types/preset-sheets-core/index.js";

// Map sheetId -> permissionId for header protections
const headerProtectionMap = new Map<string, string>();

export async function lockHeaders(api: FUniver) {
    const wb = api.getActiveWorkbook()
    if (!wb) return;

    const permission = wb.getPermission()
    if (!permission) return;

    const point = permission.permissionPointsDefinition.RangeProtectionPermissionEditPoint
    if (!point) return;

    const unitId = wb.getId()

    const sheets = wb.getSheets() || [];
    for (const sid of sheets) {
        const s = wb.getSheetBySheetId(sid.getSheetId())
        if (!s) continue

        const subUnitId = s.getSheetId();
        const range = s.getRange('A1:AB1')

        const res = await permission.addRangeBaseProtection(unitId, subUnitId, [range])
        if (!res) continue
        const { permissionId } = res
        headerProtectionMap.set(subUnitId, permissionId)
        permission.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
    }
}

// Temporarily allow editing header (A1:AB1) while applying changes
export async function withHeaderUnlocked(api: FUniver, fn: () => Promise<void> | void) {
    const wb = api.getActiveWorkbook?.()
    const permission = wb?.getPermission?.()
    const point = (permission as any)?.permissionPointsDefinition?.RangeProtectionPermissionEditPoint
    const unitId = wb?.getId?.()

    if (!wb || !permission || !point || !unitId) {
        await fn()
        return
    }

    const sheets = wb.getSheets?.() || []
    try {
        for (const sid of sheets as any[]) {
            const subUnitId = sid.getSheetId?.()
            const permissionId = subUnitId ? headerProtectionMap.get(subUnitId) : undefined
            if (permissionId) {
                // enable editing for header range
                permission.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, true)
            }
        }
        await fn()
    } finally {
        for (const sid of sheets as any[]) {
            const subUnitId = sid.getSheetId?.()
            const permissionId = subUnitId ? headerProtectionMap.get(subUnitId) : undefined
            if (permissionId) {
                // disable editing back
                permission.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
            }
        }
    }
}