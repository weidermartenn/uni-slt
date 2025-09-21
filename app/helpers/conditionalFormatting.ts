import { FUniver, BorderType, BorderStyleTypes } from "@univerjs/presets";
import type { FWorksheet } from "@univerjs/presets/lib/types/preset-sheets-core/index.js";
export async function addConditionalFormatting(api: FUniver, sheet: FWorksheet) {
  const a1 = 'B2:B1000';
  const range = sheet.getRange(a1);

  // Формула с абсолютными ссылками на диапазон и относительной на текущую ячейку верхнего левого угла диапазона
  const formula = '=AND(LEN(B2)>0, COUNTIF($B$2:$B$1000, B2) > 1)';

  const rule = sheet.newConditionalFormattingRule()
    .whenFormulaSatisfied(formula)
    .setRanges([range.getRange()])
    .setBackground('#9DFF73')
    .setFontColor('#000000')
    .build();

  sheet.addConditionalFormattingRule(rule);
  range.setBorder(BorderType.ALL, BorderStyleTypes.THIN, '#DDDDDD');
}
