export default defineEventHandler(async (event) => {
    const { public: { sltApiBase } } = useRuntimeConfig()
    if (!sltApiBase) {
        throw createError({ statusCode: 500, statusMessage: 'sltApiBase не указан' })
    }

    try {
        // Получение массива идентификаторов из тела запроса
        const body = await readBody(event);
        const transportAccountingIds = body.transportAccountingIds;

        // Проверка на наличие идентификаторов
        if (!transportAccountingIds || !Array.isArray(transportAccountingIds)) {
            throw createError({ statusCode: 400, statusMessage: 'Неверный формат данных' });
        }

        return await $fetch(`${sltApiBase}/workTable/transportAccounting`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getCookie(event, 'access_token')}` },
            body: transportAccountingIds
        })
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка',
            data: e?.data
        })
    }
})