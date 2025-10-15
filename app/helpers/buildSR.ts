// helpers/buildSR.ts
import { toStr, normalizeDateInput } from './utils'

const dateCols = new Set([0, 4, 11, 12, 19])

export const COL_TO_KEY = [
  "dateOfPickup", "numberOfContainer", "cargo", "typeOfContainer",
  "dateOfSubmission", "addressOfDelivery", "ourFirm", "client",
  "formPayAs", "summa", "numberOfBill", "dateOfBill", "datePayment",
  "contractor", "driver", "formPayHim", "contractorRate", "sumIssued",
  "numberOfBillAdd", "dateOfPaymentContractor", "manager", "departmentHead",
  "clientLead", "salesManager", "additionalExpenses", "income", "incomeLearned", "id"
] as const

export function buildSR(rowVals: any[], listName: string, id: number = 0) {
  const v = (i: number) =>
    dateCols.has(i) ? normalizeDateInput(rowVals[i]) ?? '' : toStr(rowVals[i])

  return {
    additionalExpenses: v(24),
    addressOfDelivery: v(5),
    cargo: v(2),
    client: v(7),
    clientLead: v(22),
    contractor: v(13),
    contractorRate: v(16),
    dateOfBill: v(11),
    dateOfPaymentContractor: v(19),
    dateOfPickup: v(0),
    dateOfSubmission: v(4),
    datePayment: v(12),
    departmentHead: v(21),
    driver: v(14),
    formPayAs: v(8),
    formPayHim: v(15),
    id,
    listName,
    income: v(25),
    incomeLearned: v(26),
    manager: v(20),
    numberOfBill: v(10),
    numberOfBillAdd: v(18),
    numberOfContainer: v(1),
    ourFirm: v(6),
    salesManager: v(23),
    sumIssued: v(17),
    summa: v(9),
    taxes: "",
    typeOfContainer: v(3),
  }
}
