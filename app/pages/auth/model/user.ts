const postUserLoginCode = async (login: string) => {
  const { public: { kingsApiBase } } = useRuntimeConfig();

  return await $fetch(`${kingsApiBase}/user/loginByCode`, {
    method: "POST",
    body: { login },
  });
};

const postUserConfirmCode = async (login: string, confirmToken: string) => {
  const { public: { kingsApiBase } } = useRuntimeConfig();

  return await $fetch(`${kingsApiBase}/user/loginByCodeConfirmation`, {
    method: "POST",
    body: { login, confirmToken },
  });
};

export { postUserLoginCode, postUserConfirmCode };