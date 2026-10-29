import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Users,
  ShieldCheck,
  Bell,
  Sparkles,
  Award,
  ChevronDown,
  UserCheck,
  CheckCheck,
  Share2,
  Lock,
  Database,
  LogIn,
  UserPlus,
  LogOut,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { CodeGenzLogo, CodeGenzMascot } from './Logo';

interface HeaderProps {
  onOpenPrivacy: () => void;
  onOpenHappiness: () => void;
  onOpenAIChat: () => void;
  onOpenDataManagement: () => void;
  onOpenFamilyManagement: (tab?: 'overview' | 'invite' | 'invitations' | 'all_families') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPrivacy,
  onOpenHappiness,
  onOpenAIChat,
  onOpenDataManagement,
  onOpenFamilyManagement,
}) => {
  const {
    currentUser,
    family,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveTab,
    openAuthModal,
    logout,
    isAuthenticated,
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead && n.userId === currentUser.id).length;
  const userNotifs = notifications.filter((n) => n.userId === currentUser.id);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(family.familyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'student':
        return <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-100">Học sinh</span>;
      case 'parent':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-rose-100">Phụ huynh</span>;
      case 'psychologist':
        return <span className="bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-sky-100">Chuyên gia</span>;
      case 'admin':
        return <span className="bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-purple-100">Admin</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand Mascot */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            {/* Mascot Icon */}
            <div className="relative transform group-hover:scale-105 transition-transform duration-200">
              <CodeGenzMascot size={46} />
            </div>

            {/* Official Brand Wordmark Logo */}
            <div className="flex flex-col">
              <CodeGenzLogo size="sm" />
              <span className="hidden xl:inline-block text-[10px] font-semibold text-slate-500 tracking-wider">
                Connect • Open • Develop • Empathy
              </span>
            </div>
          </div>

          {/* Quick Stats & Family Code - Only visible when logged in for Student / Parent */}
          {isAuthenticated && (currentUser.role === 'student' || currentUser.role === 'parent') && (
            <div className="hidden md:flex items-center gap-3">
              {/* Happiness Points */}
              <button
                onClick={onOpenHappiness}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 transition-all text-xs font-semibold shadow-2xs group"
                title="Xem chi tiết Happiness Points & Cấp độ gia đình"
              >
                <span className="text-base group-hover:rotate-12 transition-transform">⭐</span>
                <span className="font-extrabold text-amber-700">{family.happinessPoints} pts</span>
                <span className="text-[10px] bg-amber-200/70 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  🔥 {family.streakDays} ngày
                </span>
              </button>

              {/* Family Code & Group Management Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/80 hover:bg-indigo-100/70 border border-indigo-100 text-indigo-900 text-xs font-semibold transition-all">
                <button
                  onClick={() => onOpenFamilyManagement('overview')}
                  className="flex items-center gap-1.5 text-left cursor-pointer hover:text-indigo-700"
                  title="Quản lý nhóm gia đình & các thành viên kết nối"
                >
                  <span className="text-sm">{family.avatarIcon || '🏡'}</span>
                  <span className="tracking-wide text-slate-700 font-bold max-w-[130px] truncate">{family.name}:</span>
                  <strong className="font-mono text-indigo-700 font-bold">{family.familyCode}</strong>
                </button>
                <button
                  onClick={handleCopyCode}
                  className="text-indigo-600 hover:text-indigo-900 p-0.5 rounded ml-0.5 transition-colors cursor-pointer"
                  title="Sao chép mã gia đình để mời thành viên"
                >
                  {copiedCode ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Role Status Pill for Psychologist */}
          {isAuthenticated && currentUser.role === 'psychologist' && (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold shadow-2xs">
              <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="font-bold text-teal-900">Chuyên gia tâm lý học đường</span>
              <span className="text-[10px] bg-teal-200/70 text-teal-950 font-bold px-2 py-0.5 rounded-full">
                Tham vấn & Bảo mật
              </span>
            </div>
          )}

          {/* Role Status Pill for Admin */}
          {isAuthenticated && currentUser.role === 'admin' && (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-2xs border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold tracking-wide">Quản trị hệ thống CODE</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Toàn quyền
              </span>
            </div>
          )}

          {/* Right Action Icons & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Assistant Button matching exact image logo and pill shape */}
            <button
              onClick={onOpenAIChat}
              className="flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#581C87] via-[#86198F] to-[#DB2777] hover:from-[#4C1D95] hover:via-[#701A75] hover:to-[#BE185D] text-white shadow-md hover:shadow-lg shadow-purple-600/25 transition-all duration-200 active:scale-95 group border border-white/20"
              title="Trợ lý AI CODE - Đồng hành chia sẻ, gợi ý giao tiếp & tham vấn"
            >
              {/* Star Sparkle Icon matching image */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#FDE047] drop-shadow-sm group-hover:scale-110 transition-transform">
                  <path
                    d="M12 3C12 7.5 15.5 11 20 11C15.5 11 12 14.5 12 19C12 14.5 8.5 11 4 11C8.5 11 12 7.5 12 3Z"
                    stroke="#FDE047"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="#FEF08A"
                    fillOpacity="0.25"
                  />
                  <circle cx="5" cy="18" r="1.5" fill="#FDE047" />
                  <path d="M19 4L19.4 5.2L20.6 5.6L19.4 6L19 7.2L18.6 6L17.4 5.6L18.6 5.2L19 4Z" fill="#FDE047" />
                </svg>
              </div>
              <div className="flex flex-col text-left leading-none justify-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight">Trợ lý AI</span>
                <span className="text-xs sm:text-sm font-black text-white tracking-wide font-sans mt-0.5">CODE</span>
              </div>
            </button>

          {/* Data & XML Database Manager - Only visible when logged in as Admin */}
          {isAuthenticated && currentUser.role === 'admin' && (
            <button
              onClick={onOpenDataManagement}
              className="p-2 rounded-full text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 transition-colors border border-transparent hover:border-cyan-100 flex items-center gap-1"
              title="Sao lưu dữ liệu lâu dài (Xuất XML / JSON / SQL & Quản trị Database)"
            >
              <Database className="w-5 h-5 text-cyan-600" />
            </button>
          )}

            {/* Privacy & Security */}
            <button
              onClick={onOpenPrivacy}
              className="p-2 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
              title="Trung tâm bảo mật & phân quyền riêng tư CODE"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </button>

            {/* Notification Popover - Only visible when logged in */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  id="header-notifications-btn"
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors relative border border-transparent hover:border-indigo-100 cursor-pointer"
                  title="Thông báo của bạn"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-widest font-extrabold text-slate-800">
                        Thông báo của bạn ({userNotifs.length})
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-indigo-600 hover:underline font-bold"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {userNotifs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 italic">
                          Chưa có thông báo nào mới
                        </div>
                      ) : (
                        userNotifs.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              markNotificationRead(item.id);
                              if (item.actionTab) setActiveTab(item.actionTab);
                              setShowNotifDropdown(false);
                            }}
                            className={`p-3.5 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                              !item.isRead ? 'bg-indigo-50/50 font-medium' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                              {!item.isRead && <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0 mt-1"></span>}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1.5 block">
                              {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons & User Profile Menu */}
            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <>
                  <button
                    id="header-login-btn"
                    onClick={() => openAuthModal('login')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-200 active:scale-95"
                    title="Đăng nhập tài khoản"
                  >
                    <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Đăng nhập</span>
                  </button>

                  <button
                    id="header-register-btn"
                    onClick={() => openAuthModal('register')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Đăng ký tài khoản mới"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Current User & Role Switcher */}
                  <div className="relative">
                    <button
                      id="header-user-menu-btn"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-2 p-1.5 pl-2 rounded-full hover:bg-indigo-50 border border-slate-200 transition-colors bg-white shadow-2xs cursor-pointer"
                    >
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-7 h-7 rounded-full object-cover border border-indigo-200"
                      />
                      <div className="text-left hidden lg:block pr-1">
                        <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                          {currentUser.name}
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="text-[10px] text-indigo-600 font-semibold">
                          {currentUser.role === 'student' ? 'Học sinh' : currentUser.role === 'parent' ? (currentUser.familyRole === 'father' ? 'Bố' : 'Mẹ') : currentUser.role === 'psychologist' ? 'Chuyên gia' : 'Admin'}
                        </div>
                      </div>
                    </button>

                    {/* Rich User & Role Switcher Menu */}
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 overflow-hidden">
                        {/* User Profile Header */}
                        <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl border border-slate-100 mb-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={currentUser.avatar}
                              alt={currentUser.name}
                              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</h4>
                              <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {getRoleBadge(currentUser.role)}
                                {currentUser.verified && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Đã xác thực
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Family / Role Hub Button */}
                        <div className="px-1 mb-2">
                          {currentUser.role === 'student' || currentUser.role === 'parent' ? (
                            <button
                              onClick={() => {
                                setShowUserDropdown(false);
                                onOpenFamilyManagement('overview');
                              }}
                              className="w-full flex items-center justify-between p-2.5 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-xl text-xs font-bold text-indigo-900 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">{family.avatarIcon || '🏡'}</span>
                                <div className="text-left">
                                  <div className="leading-tight text-slate-800">Tổ ấm: {family.name}</div>
                                  <div className="text-[10px] text-indigo-600 font-mono">Mã: {family.familyCode} • Kết nối con & cha mẹ</div>
                                </div>
                              </div>
                              <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md">Quản lý</span>
                            </button>
                          ) : currentUser.role === 'admin' ? (
                            <button
                              onClick={() => {
                                setShowUserDropdown(false);
                                onOpenFamilyManagement('all_families');
                              }}
                              className="w-full flex items-center justify-between p-2.5 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/80 rounded-xl text-xs font-bold text-purple-900 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">🏢</span>
                                <div className="text-left">
                                  <div className="leading-tight text-slate-800">Quản lý tất cả tổ ấm gia đình</div>
                                  <div className="text-[10px] text-purple-600 font-semibold">Theo dõi & phân quyền toàn hệ thống</div>
                                </div>
                              </div>
                              <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-md">Xem tất cả</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowUserDropdown(false);
                                onOpenPrivacy();
                              }}
                              className="w-full flex items-center justify-between p-2.5 bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/80 rounded-xl text-xs font-bold text-teal-900 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">🩺</span>
                                <div className="text-left">
                                  <div className="leading-tight text-slate-800">Hồ sơ chuyên gia & Quy chuẩn bảo mật</div>
                                  <div className="text-[10px] text-teal-700 font-semibold">Đảm bảo đạo đức nghề nghiệp tâm lý</div>
                                </div>
                              </div>
                              <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-md">Chi tiết</span>
                            </button>
                          )}
                        </div>

                        {/* Quick Auth Actions */}
                        <div className="grid grid-cols-2 gap-1.5 px-1 mb-2">
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              openAuthModal('login');
                            }}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Đổi tài khoản</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              openAuthModal('register');
                            }}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-purple-700 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                            <span>Đăng ký mới</span>
                          </button>
                        </div>

                        {/* Logout Option in dropdown */}
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <button
                            id="dropdown-logout-btn"
                            onClick={() => {
                              setShowUserDropdown(false);
                              logout();
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-100"
                          >
                            <LogOut className="w-4 h-4 text-rose-600" />
                            <span>Đăng xuất khỏi hệ thống</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prominent Header Logout Button */}
                  <button
                    id="header-logout-btn"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 group"
                    title="Đăng xuất khỏi hệ thống"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Đăng xuất</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

