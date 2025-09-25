export default defineEventHandler(async (ev) => {
    const { public: { kingsApiBase } } = useRuntimeConfig()

    type Body = { login: string; confirmToken?: string }
    const body = await readBody<Body>(ev)

    // шаг 1
    if (!body.confirmToken) {
        try {
            const res = await $fetch(`${kingsApiBase}/user/loginByCode`, {
                method: 'POST',
                body: { login: body.login }
            })
            return res
        } catch (e: any) {
            console.error({
                status: e.status,
                message: e.message,
                data: e.data
            })
        }
    }

    // шаг 2
    try {
        const res = await $fetch(`${kingsApiBase}/user/loginByCodeConfirmation`, {
            method: 'POST',
            body: { login: body.login, confirmToken: body.confirmToken }
                
        })

        // @ts-ignore
        const token = res?.object?.jwtToken
        // @ts-ignore
        const user = res?.object?.user 

        const isHttps = getRequestHeader(ev, 'x-forwarded-proto') === 'https' ||
        (ev.node.req as any).socket?.enctypted === true
        
        if (token) {
            setCookie(ev, 'access_token', token, {
                httpOnly: true, sameSite: 'lax', path: '/',
                secure: isHttps,
                maxAge: 60 * 60 * 24 * 30 // 30 days
            })
        }

        if (user) {
            const minimal = { id: user.id, confirmed: user.confirmed, roleCode: user.role?.code ?? null, token: token }
            setCookie(ev, 'u', Buffer.from(JSON.stringify(minimal)).toString('base64'), {
                httpOnly: false, sameSite: 'lax', path: '/',
                secure: isHttps,
                maxAge: 60 * 60 * 24 * 30 // 30 days
            })
        }

        return res
    } catch (e: any) {
        console.error({
            status: e.status,
            message: e.message,
            data: e.data
        })
    }
})