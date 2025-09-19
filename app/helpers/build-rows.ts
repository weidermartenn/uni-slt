import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";

const letterToColumnIndex = (letter: string) => {
  return letter.charCodeAt(0) - 'A'.charCodeAt(0);
};

export async function buildRowCells(rec: TransportAccounting, me: any) {
  const blockedColumns = new Set<number>();
  if (rec.managerBlockListCell && Array.isArray(rec.managerBlockListCell)) {
    rec.managerBlockListCell.forEach(range => {
      if (range.length === 1 && range[0]) {
        blockedColumns.add(letterToColumnIndex(range[0]));
      } else if (range.length >= 2 && range[0] && range[1]) {
        const start = letterToColumnIndex(range[0]);
        const end = letterToColumnIndex(range[1]);
        for (let i = start; i <= end; i++) {
          blockedColumns.add(i);
        }
      }
    });
  }

  const cell = (v: any, col: number) =>
    ({
      v: v ?? "",
      s: [25, 26].includes(col) || (me?.roleCode === 'ROLE_MANAGER' && blockedColumns.has(col))
        ? "lockedCol"
        : rec?.managerBlock && me?.roleCode !== "ROLE_ADMIN" && me?.roleCode !== "ROLE_BUH"
        ? "lockedRow"
        : "ar",
    } as { v: any; s: string });

  const row: Record<number, { v: any; s: string }> = {};
  row[0] = cell(rec?.dateOfPickup, 0);
  row[1] = cell(rec?.numberOfContainer, 1);
  row[2] = cell(rec?.cargo, 2);
  row[3] = cell(rec?.typeOfContainer, 3);
  row[4] = cell(rec?.dateOfSubmission, 4);
  row[5] = cell(rec?.addressOfDelivery, 5);
  row[6] = cell(rec?.ourFirm, 6);
  row[7] = cell(rec?.client, 7);
  row[8] = cell(rec?.formPayAs, 8);
  row[9] = cell(rec?.summa, 9);
  row[10] = cell(rec?.numberOfBill, 10);
  row[11] = cell(rec?.dateOfBill, 11);
  row[12] = cell(rec?.datePayment, 12);
  row[13] = cell(rec?.contractor, 13);
  row[14] = cell(rec?.driver, 14);
  row[15] = cell(rec?.formPayHim, 15);
  row[16] = cell(rec?.contractorRate, 16);
  row[17] = cell(rec?.sumIssued, 17);
  row[18] = cell(rec?.numberOfBillAdd, 18);
  row[19] = cell(rec?.dateOfPaymentContractor, 19);
  row[20] = cell(rec?.manager, 20);
  row[21] = cell(rec?.departmentHead, 21);
  row[22] = cell(rec?.clientLead, 22);
  row[23] = cell(rec?.salesManager, 23);
  row[24] = cell(rec?.additionalExpenses, 24);
  row[25] = cell(rec?.income, 25);
  row[26] = cell(rec?.incomeLearned, 26);
  row[27] = { v: rec?.id ?? "", s: "id" };
  return row;
}