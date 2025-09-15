import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types";
import type { H3Event } from "h3";

export default defineEventHandler(async (event: H3Event) => {
  const { public: { sltApiBase } } = useRuntimeConfig();

  const raw = await readBody<any>(event);

  const dtos: TransportAccountingSR[] = raw.map((item: any) => {
    if (typeof item === "string") return { id: item };
    return item;
  });

  const send = async (body: any) => {
    return $fetch(`${sltApiBase}/workTable/transportAccounting`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getCookie(event, "access_token")}` },
      body: body,
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
