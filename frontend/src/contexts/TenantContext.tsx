'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Tenant {
  id: number;
  subdomain: string;
  name: string;
  status: 'active' | 'suspended' | 'cancelled';
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantSubdomain: string | null;
  setTenant: (tenant: Tenant | null) => void;
  setTenantSubdomain: (subdomain: string | null) => void;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = 'tenantSubdomain';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [tenantSubdomain, setTenantSubdomainState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load tenant subdomain from localStorage on mount
  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const storedSubdomain = localStorage.getItem(TENANT_STORAGE_KEY);
    if (storedSubdomain) {
      setTenantSubdomainState(storedSubdomain);
    }
    setLoading(false);
  }, []);

  const setTenant = (newTenant: Tenant | null) => {
    setTenantState(newTenant);
    if (typeof window !== 'undefined') {
      if (newTenant) {
        setTenantSubdomainState(newTenant.subdomain);
        localStorage.setItem(TENANT_STORAGE_KEY, newTenant.subdomain);
      } else {
        setTenantSubdomainState(null);
        localStorage.removeItem(TENANT_STORAGE_KEY);
      }
    }
  };

  const setTenantSubdomain = (subdomain: string | null) => {
    setTenantSubdomainState(subdomain);
    if (typeof window !== 'undefined') {
      if (subdomain) {
        localStorage.setItem(TENANT_STORAGE_KEY, subdomain);
      } else {
        localStorage.removeItem(TENANT_STORAGE_KEY);
        setTenantState(null);
      }
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantSubdomain,
        setTenant,
        setTenantSubdomain,
        loading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
