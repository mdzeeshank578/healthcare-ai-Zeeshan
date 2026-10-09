import React from 'react';
import { NavLink } from 'react-router-dom';
import { Role } from '../../types';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Brain,
  BarChart3,
  MapPin,
  Menu,
} from 'lucide-react';

interface BottomNavProps {
  role: Role;
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, onOpenMenu }) => {
  const doctorNav = [
    { to: '/doctor', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/doctor/patients', label: 'Patients', icon: Users },
    { to: '/doctor/assessments', label: 'Intake', icon: ClipboardList },
    { to: '/doctor/predictions', label: 'AI Risks', icon: Brain },
  ];

  const adminNav = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/patients', label: 'Patients', icon: Users },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/villages', label: 'Villages', icon: MapPin },
  ];

  const items = role === 'doctor' ? doctorNav : adminNav;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-[#1976D2] font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl text-slate-500 hover:text-slate-700 font-medium transition-colors"
          aria-label="Open portal menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
