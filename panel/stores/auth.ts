import { defineStore } from 'pinia';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  native_lang: 'tr' | 'en';
}

const TOKEN_KEY = 'supsf_token';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null as AuthUser | null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    restore() {
      this.token = localStorage.getItem(TOKEN_KEY);
    },
    setSession(token: string, user: AuthUser) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      this.notifyExtension();
    },
    clear() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      window.postMessage({ type: 'SUPSF_LOGOUT' }, window.location.origin);
    },
    /** Hands the token to the browser extension's content script running on this origin. */
    notifyExtension() {
      const send = () => window.postMessage({ type: 'SUPSF_AUTH', token: this.token }, window.location.origin);
      if (this.token) {
        send();
        // The extension's content script may attach slightly after the page boots.
        setTimeout(send, 1000);
      }
    },
    async login(email: string, password: string) {
      const { token, user } = await useApi()<{ token: string; user: AuthUser }>('/login', {
        method: 'POST',
        body: { email, password },
      });
      this.setSession(token, user);
    },
    async register(payload: { email: string; password: string }) {
      const { token, user } = await useApi()<{ token: string; user: AuthUser }>('/register', {
        method: 'POST',
        body: payload,
      });
      this.setSession(token, user);
    },
    async setNativeLang(native_lang: 'tr' | 'en') {
      this.user = await useApi()<AuthUser>('/me', { method: 'PATCH', body: { native_lang } });
    },
    async logout() {
      try {
        await useApi()('/logout', { method: 'POST' });
      } finally {
        this.clear();
      }
    },
  },
});
