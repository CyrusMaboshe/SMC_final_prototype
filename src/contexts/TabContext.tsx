'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

export type TabType = 'home' | 'login' | 'apply' | 'updates' | 'documents' | 'staffs';

interface TabContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  preloadedTabs: Set<TabType>;
  preloadTab: (tab: TabType) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const useTab = () => {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
};

interface TabProviderProps {
  children: ReactNode;
}

export const TabProvider: React.FC<TabProviderProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [preloadedTabs, setPreloadedTabs] = useState<Set<TabType>>(new Set(['home']));

  // Optimized tab switching with preloading
  const handleSetActiveTab = useCallback((tab: TabType) => {
    // Use requestAnimationFrame for smooth transitions
    requestAnimationFrame(() => {
      setActiveTab(tab);
      setPreloadedTabs(prev => new Set([...prev, tab]));
    });
  }, []);

  // Preload tab content
  const preloadTab = useCallback((tab: TabType) => {
    setPreloadedTabs(prev => new Set([...prev, tab]));
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    activeTab,
    setActiveTab: handleSetActiveTab,
    preloadedTabs,
    preloadTab
  }), [activeTab, handleSetActiveTab, preloadedTabs, preloadTab]);

  return (
    <TabContext.Provider value={contextValue}>
      {children}
    </TabContext.Provider>
  );
};
