export const useApi = () => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  return $fetch.create({
    baseURL: config.public.apiBase,
    headers: { Accept: 'application/json' },
    onRequest({ options }) {
      if (auth.token) {
        const headers = new Headers(options.headers as HeadersInit);
        headers.set('Authorization', `Bearer ${auth.token}`);
        options.headers = headers;
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        auth.clear();
        navigateTo('/login');
      }
    },
  });
};
