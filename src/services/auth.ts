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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, username }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Fallo en la autenticación con el servidor');
    }

    this.token = data.token;
    this.currentUser = data.user;

    try {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {}

    this.notify();
    return data;
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

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        this.clearSession();
        return null;
      }

      const data = await res.json();
      this.currentUser = data.user;
      try {
        sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {}
      this.notify();
      return data.user;
    } catch {
      this.clearSession();
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
