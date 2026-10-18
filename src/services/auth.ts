export type UserRole = 'ADMIN' | 'TRANSMISOR' | 'MODERADOR' | 'EDITOR';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  message: string;
}

const TOKEN_KEY = 'golbolivia_jwt_token';
const USER_KEY = 'golbolivia_auth_user';

class AuthService {
  private token: string | null = null;
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.token = this.getStoredToken();
    this.currentUser = this.getStoredUser();

    // If token exists but user not loaded, recover immediately from JWT payload
    if (this.token && !this.currentUser) {
      const payload = this.parseJwtPayload(this.token);
      if (payload && payload.userId && payload.role) {
        this.currentUser = {
          id: payload.userId,
          username: payload.username || 'admin',
          name: payload.name || 'Director General de Transmisión',
          role: payload.role,
        };
      }
    }
  }

  public parseJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        // Base64url decode payload
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload);
      }
    } catch {}
    return null;
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }

  private getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  public hasRole(allowedRoles: UserRole[]): boolean {
    if (!this.currentUser) return false;
    return allowedRoles.includes(this.currentUser.role);
  }

  public onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentUser);
      } catch {}
    });
  }

  /**
   * Perform secure backend authentication
   * Server validates PIN and returns a cryptographically signed HMAC/JWT token
   */
  async login(pin: string, username = 'admin'): Promise<LoginResponse> {
    const cleanPin = (pin || '').trim();
    const cleanUsername = (username || 'admin').trim().toLowerCase();

    let lastError = 'No se pudo conectar con el servidor de autenticación. Intenta nuevamente.';

    for (const endpoint of ['/api/auth/login', '/auth/login']) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: cleanPin, username: cleanUsername }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          this.token = data.token;
          this.currentUser = data.user;

          try {
            sessionStorage.setItem(TOKEN_KEY, data.token);
            sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } catch {}

          this.notify();
          return data;
        }

        if (contentType.includes('application/json')) {
          const errData = await res.json().catch(() => null);
          if (errData && errData.error) {
            if (res.status === 404 && endpoint === '/api/auth/login') {
              lastError = errData.error;
              continue;
            }
            throw new Error(errData.error);
          }
        }
      } catch (err: any) {
        if (err?.message && !(err instanceof TypeError)) throw err;
        lastError = err?.message || lastError;
      }
    }

    throw new Error(lastError);
  }

  /**
   * Verify token validity directly on backend /api/auth/me
   */
  async validateSession(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return null;
    }

    // Check JWT expiration locally first
    const payload = this.parseJwtPayload(token);
    if (payload && payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      this.clearSession();
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // ONLY clear session if server explicitly rejects credentials (401 Unauthorized or 403 Forbidden)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.clearSession();
          return null;
        }
        // Server unavailable: keep the stored token for a retry, but never trust it unverified.
        return null;
      }

      const data = await res.json();
      if (data && data.user) {
        this.currentUser = data.user;
        try {
          sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } catch {}
        this.notify();
        return data.user;
      }

      return null;
    } catch {
      // Offline: keep the stored token for a retry, but never trust it unverified.
      return null;
    }
  }

  /**
   * Invalidate session both locally and on backend
   */
  async logout(): Promise<void> {
    const token = this.token;
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch {}
    }

    this.clearSession();
  }

  private clearSession(): void {
    this.token = null;
    this.currentUser = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    this.notify();
  }
}

export const authService = new AuthService();
