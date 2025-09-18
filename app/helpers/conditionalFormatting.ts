import { FUniver, BorderType, BorderStyleTypes } from "@univerjs/presets";
export async function addConditionalFormatting(api: FUniver) {
  const wb = api.getActiveWorkbook();
  const ws = wb.getActiveSheet();
  const a1 = 'B2:B1000';
  const range = ws.getRange(a1);

  // Формула с абсолютными ссылками на диапазон и относительной на текущую ячейку верхнего левого угла диапазона
  const formula = '=AND(LEN(B2)>0, COUNTIF($B$2:$B$1000, B2) > 1)';

  const rule = ws.newConditionalFormattingRule()
    .whenFormulaSatisfied(formula)
    .setRanges([range.getRange()])
    .setBackground('#9DFF73')
    .setFontColor('#000000')
    .build();

  ws.addConditionalFormattingRule(rule);
  range.setBorder(BorderType.ALL, BorderStyleTypes.THIN, '#DDDDDD');
}
