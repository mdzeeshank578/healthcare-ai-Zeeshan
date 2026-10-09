import React, { useState } from 'react';
import { User } from '../../types';
import { Search, Bell, Menu, ChevronDown, User as UserIcon, LogOut } from 'lucide-react';
import { formatDoctorGreetingName, getAvatarInitial } from '../../utils/doctor.utils';

interface HeaderProps {
  user: User | null;
  onMenuToggle: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onMenuToggle, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const displayName =
    user?.role === 'doctor' ? formatDoctorGreetingName(user?.name) : user?.name || 'User';
  const avatarLetter =
    user?.role === 'doctor'
      ? getAvatarInitial(user?.name)
      : user?.name?.charAt(0) || 'U';

  return (
    <header className="h-14 sm:h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="lg:hidden flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">HealthAI</span>
        </div>
      </div>

      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, vitals, village reports..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2]"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1" />

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="User profile options"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-[#1976D2]/20"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1976D2] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {avatarLetter}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[120px] lg:max-w-none">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 capitalize mt-1">
                {user?.role === 'doctor' ? 'Medical Officer' : 'System Administrator'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="sm:hidden px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-500 capitalize">
                    {user?.role === 'doctor' ? 'Medical Officer' : 'Administrator'}
                  </p>
                </div>
                <a
                  href={`/${user?.role}/settings`}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  <UserIcon className="w-4 h-4 text-slate-400" /> Profile Settings
                </a>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};