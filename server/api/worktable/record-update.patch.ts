import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types";
import type { H3Event } from "h3";

export default defineEventHandler(async (event: H3Event) => {
  const {
    public: { sltApiBase },
  } = useRuntimeConfig();

  if (!sltApiBase) {
    throw createError({
      statusCode: 500,
      statusMessage: "sltApiBase не указан",
    });
  }

  const raw = await readBody<any>(event);

  let items: any[] = [];
  if (Array.isArray(raw)) items = raw;
  else if (Array.isArray(raw?.transportAccountingSaveRequestDtos))
    items = raw.transportAccountingSaveRequestDtos;
  else if (Array.isArray(raw?.transportAccountingSR)) items = raw.transportAccountingSR;
  else if (raw?.data) items = [raw.data];
  else if (raw) items = [raw];

  if (!items.length) {
    throw createError({ statusCode: 400, statusMessage: "Данные не указаны" });
  }

  const S = (v: unknown) =>
    v == null ? "" : String(v).replace(/\r?\n/g, "").trim();

  const D = (v: unknown) => {
    const s = S(v)
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s
  }

  const dtos = items.map((d: TransportAccountingSR) => ({
    additionalExpenses: S(d.additionalExpenses),
    addressOfDelivery: S(d.addressOfDelivery),
    cargo: S(d.cargo),
    client: S(d.client),
    clientLead: S(d.clientLead),
    contractor: S(d.contractor),
    contractorRate: S(d.contractorRate),
    dateOfBill: D(d.dateOfBill),
    dateOfPaymentContractor: D(d.dateOfPaymentContractor),
    dateOfPickup: D(d.dateOfPickup),
    dateOfSubmission: D(d.dateOfSubmission),
    datePayment: D(d.datePayment),
    departmentHead: S(d.departmentHead),
    driver: S(d.driver),
    formPayAs: S(d.formPayAs),
    formPayHim: S(d.formPayHim),
    id: Number(d.id) || 0,
    listName: S(d.listName) || 'Транспортный учет',
    manager: S(d.manager),
    numberOfBill: S(d.numberOfBill),
    numberOfBillAdd: S(d.numberOfBillAdd),
    numberOfContainer: S(d.numberOfContainer),
    ourFirm: S(d.ourFirm),
    salesManager: S(d.salesManager),
    sumIssued: S(d.sumIssued),
    summa: S(d.summa),
    typeOfContainer: S(d.typeOfContainer)
  }))

  const send = async (body: any) => {
    $fetch(`${sltApiBase}/workTable/transportAccounting`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${getCookie(event, "access_token")}` },
      body,
    })
  }

  try {
    return await send(dtos)
  } catch (e: any) {
    throw createError({
      statusCode: e?.status || 500,
      statusMessage: e?.data?.message || "Произошла ошибка",
      data: e?.data,
    });
  }
});
