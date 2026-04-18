'use client';

import { createContext, useContext, type ReactNode } from 'react';

const SidebarInitialCollapsedContext = createContext(false);

export function SidebarStateProvider({
  children,
  initialCollapsed,
}: {
  children: ReactNode;
  initialCollapsed: boolean;
}) {
  return (
    <SidebarInitialCollapsedContext.Provider value={initialCollapsed}>
      {children}
    </SidebarInitialCollapsedContext.Provider>
  );
}

export function useInitialSidebarCollapsed() {
  return useContext(SidebarInitialCollapsedContext);
}
