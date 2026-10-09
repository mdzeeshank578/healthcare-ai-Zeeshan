import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Role, User } from '../../types';
import { authService } from '../../services/auth.service';
import { authStorage } from '../../services/auth.storage';
import { api } from '../../services/api';

interface DashboardLayoutProps {
  role: Role;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const current = authService.getCurrentUser();
    setUser(current);

    if (role === 'doctor' && (!current?.name || current.name === 'Doctor')) {
      api
        .get<{ success: boolean; data: { fullName?: string } }>('/doctors/me')
        .then((res) => {
          if (res.data?.data?.fullName) {
            const realName = res.data.data.fullName;
            if (current) {
              const updated = { ...current, name: realName };
              setUser(updated);
              const token = authStorage.getAccessToken();
              const refresh = authStorage.getRefreshToken();
              if (token && refresh) authStorage.setSession(token, refresh, updated);
            }
          }
        })
        .catch(() => undefined);
    }
  }, [role]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col lg:flex-row antialiased selection:bg-blue-100">
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 w-full">
        <Header
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet context={{ user }} />
        </main>

        <footer className="hidden lg:block py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
          HealthAI Decision Support System — Powered by Machine Learning.
        </footer>

        <BottomNav role={role} onOpenMenu={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
};
