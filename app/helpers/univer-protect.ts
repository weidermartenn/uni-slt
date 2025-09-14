import type { FUniver } from "@univerjs/presets";

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
        permission.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
    }
}