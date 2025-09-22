const postUserLoginCode = (login: string) => {
    return $fetch('/api/login/login', {
        method: 'POST',
        body: { login }
    })
}

const postUserConfirmCode = (login: string, confirmToken: string) => {
    return $fetch('/api/login/login', {
        method: 'POST',
        body: { login, confirmToken }
    })
}

export {
    postUserLoginCode,
    postUserConfirmCode
}