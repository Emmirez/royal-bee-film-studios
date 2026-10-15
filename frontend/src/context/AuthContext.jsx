import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionEnded, refreshSession, setAccessToken } from '../lib/api';
import { hasPermission } from '../lib/permissions';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

/**
 * Staff authentication state. Mounted only around staff/auth routes so the
 * public website never makes session calls.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);

  const applySession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    setMfaSetupRequired(Boolean(data.mfaSetupRequired));
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setMfaSetupRequired(false);
    setStatus('anonymous');
    queryClient.clear();
  }, []);

  // Restore a session from the refresh cookie on first load.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((data) => !cancelled && applySession(data))
      .catch(() => !cancelled && clearSession());
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  useEffect(() => onSessionEnded(clearSession), [clearSession]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.mfaRequired) return { mfaRequired: true, challengeToken: data.challengeToken };
      applySession(data);
            return { mfaRequired: false, mfaSetupRequired: data.mfaSetupRequired, user: data.user };
    },
    [applySession],
  );

  const verifyMfa = useCallback(
    async (challengeToken, code) => {
      const { data } = await api.post('/auth/mfa/verify', { challengeToken, code });
      applySession(data);
      return data;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setMfaSetupRequired(Boolean(data.mfaSetupRequired));
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      mfaSetupRequired,
      isAuthenticated: status === 'authenticated',
      can: (permission) => hasPermission(user, permission),
      login,
      verifyMfa,
      logout,
      applySession,
      refreshUser,
      setUser,
    }),
    [user, status, mfaSetupRequired, login, verifyMfa, logout, applySession, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
