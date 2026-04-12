import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'truck_track_auth';
const USERS_STORAGE_KEY = 'truck_track_users';

export type UserRole = 'admin' | 'gestionnaire' | 'comptable';

export interface User {
  login: string;
  role: UserRole;
}

interface StoredUser {
  login: string;
  passwordHash: string;
  role: UserRole;
}

// Hash SHA-256 des mots de passe
const GESTIONNAIRE_HASH = 'af960ccfc27d3ef7981c7fd8887ae7baa30f21aff0b9b15b6253e7b659545f87';
const ADMIN_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const COMPTABLE_HASH = '9c831eae072d3a93e92ba9d940aa186447bcef2eb777b570e267fe78a000bcb6';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Utilisateurs par défaut (admin: admin123, gestionnaire: gestion123, comptable: comptable123)
  return [
    { login: 'admin', passwordHash: ADMIN_HASH, role: 'admin' as const },
    { login: 'gestionnaire', passwordHash: GESTIONNAIRE_HASH, role: 'gestionnaire' as const },
    { login: 'comptable', passwordHash: COMPTABLE_HASH, role: 'comptable' as const },
  ];
}

function initUsers() {
  const defaultUsers = [
    { login: 'admin', passwordHash: ADMIN_HASH, role: 'admin' as const },
    { login: 'gestionnaire', passwordHash: GESTIONNAIRE_HASH, role: 'gestionnaire' as const },
    { login: 'comptable', passwordHash: COMPTABLE_HASH, role: 'comptable' as const },
  ];
  // Toujours forcer les hashes par défaut pour les utilisateurs système
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const existing: StoredUser[] = raw ? JSON.parse(raw) : [];
    const merged = defaultUsers.map(def => {
      const found = existing.find(u => u.login === def.login);
      // Conserver le hash par défaut (reset si corrompu)
      return found ? { ...found, passwordHash: def.passwordHash, role: def.role } : def;
    });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
  }
}

interface AuthContextType {
  user: User | null;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => void;
  /** Flotte : camions, trajets, chauffeurs, tiers (pas les dépenses — comptable) */
  canManageFleet: boolean;
  /** Comptabilité : dépenses, factures, banque */
  canManageAccounting: boolean;
  /** Trésorerie : caisse */
  canManageTreasury: boolean;
  /** Crédits / emprunts */
  canManageCredits: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    initUsers();
  }, []);

  const login = async (loginInput: string, password: string): Promise<boolean> => {
    const users = getStoredUsers();
    const stored = users.find(u => u.login.toLowerCase() === loginInput.toLowerCase());
    if (!stored) return false;

    const hash = await hashPassword(password);
    if (hash !== stored.passwordHash) return false;

    const u: User = { login: stored.login, role: stored.role };
    setUser(u);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const isAdmin = user?.role === 'admin';
  const isGestionnaire = user?.role === 'gestionnaire';
  const isComptable = user?.role === 'comptable';

  const canManageFleet = !user || isAdmin || isGestionnaire;
  const canManageAccounting = !user || isAdmin || isComptable;
  const canManageTreasury = !user || isAdmin || isGestionnaire;
  const canManageCredits = !user || isAdmin || isGestionnaire;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        canManageFleet,
        canManageAccounting,
        canManageTreasury,
        canManageCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

/** Liste des utilisateurs disponibles pour la sélection à la connexion */
export const LOGIN_USER_OPTIONS = [
  {
    login: 'gestionnaire',
    label: 'Gestionnaire',
    description:
      'Flotte : camions, trajets, chauffeurs, tiers. Trésorerie : caisse et crédits. GPS. Pas la saisie des dépenses ni la facturation / banque.',
  },
  {
    login: 'comptable',
    label: 'Comptable',
    description:
      'Comptabilité : dépenses, factures et banque. Consultation du reste de l’application (lecture seule hors ces modules).',
  },
  {
    login: 'admin',
    label: 'Administrateur',
    description: 'Tous les droits : flotte, trésorerie, comptabilité et paramètres.',
  },
] as const;
