export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.token) {
    auth.restore();
  }

  const isPublic = ['/login', '/register'].includes(to.path);

  if (!auth.isLoggedIn && !isPublic) {
    return navigateTo({ path: '/login', query: to.query });
  }
  if (auth.isLoggedIn && isPublic) {
    return navigateTo({ path: '/words', query: to.query });
  }
});
