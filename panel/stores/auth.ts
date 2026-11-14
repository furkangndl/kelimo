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
    },
    /** Hands the token to the browser extension's content script running on this origin. */
    notifyExtension() {
      if (this.token) {
        window.postMessage({ type: 'SUPSF_AUTH', token: this.token }, window.location.origin);
      }
    },
    async login(email: string, password: string) {
      const { token, user } = await useApi()<{ token: string; user: AuthUser }>('/login', {
        method: 'POST',
        body: { email, password },
      });
      this.setSession(token, user);
    },
    async register(payload: { name: string; email: string; password: string; native_lang: string }) {
      const { token, user } = await useApi()<{ token: string; user: AuthUser }>('/register', {
        method: 'POST',
        body: payload,
      });
      this.setSession(token, user);
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
