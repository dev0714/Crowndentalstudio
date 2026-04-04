'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { PublicAuthUser } from './public-user';

type PortalSessionState = {
  currentUser: PublicAuthUser | null;
};

const PortalSessionContext = createContext<PortalSessionState | null>(null);

export function PortalSessionProvider({
  currentUser,
  children,
}: {
  currentUser: PublicAuthUser | null;
  children: ReactNode;
}) {
  return (
    <PortalSessionContext.Provider value={{ currentUser }}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession() {
  const context = useContext(PortalSessionContext);

  if (!context) {
    throw new Error('usePortalSession must be used within a PortalSessionProvider');
  }

  return context;
}
