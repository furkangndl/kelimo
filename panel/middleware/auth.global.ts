const OPEN_PAGES = ['/privacy'];
const GUEST_PAGES = ['/login', '/register'];

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.token) {
    auth.restore();
  }

  if (OPEN_PAGES.includes(to.path)) {
    return;
  }

  const isGuestPage = GUEST_PAGES.includes(to.path);

  if (!auth.isLoggedIn && !isGuestPage) {
    return navigateTo({ path: '/login', query: to.query });
  }
  if (auth.isLoggedIn && isGuestPage) {
    return navigateTo({ path: '/words', query: to.query });
  }
});
