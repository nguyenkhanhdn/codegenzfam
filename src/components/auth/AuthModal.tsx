import { buildLegacyBackup } from '../../services/legacyAccountRecovery';
import { downloadFile } from '../../services/dataStorageService';
import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Shield,
  Heart,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  Stethoscope,
  Sparkles,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole, FamilyRole } from '../../types';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    login,
    register,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(authModalTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('student');
  const [regFamilyRole, setRegFamilyRole] = useState<FamilyRole>('student');
  const [regFamilyCode, setRegFamilyCode] = useState('');
  const [regGrade, setRegGrade] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBio, setRegBio] = useState('');

  // Sync activeTab when modal prop changes
  React.useEffect(() => {
    setActiveTab(authModalTab);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [authModalTab, authModalOpen]);

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMsg('Vui lòng nhập Email hoặc Tên người dùng.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await login({
      emailOrName: loginEmail.trim(),
      password: loginPassword,
    });

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Đăng nhập không thành công.');
    }
  };

  const handleExportLegacy = () => {
    try {
      const backup = buildLegacyBackup(localStorage);
      downloadFile('codegenz_legacy_browser_backup.json', JSON.stringify(backup, null, 2), 'application/json');
      setSuccessMsg('Đã xuất dữ liệu cũ của trình duyệt này để đối soát. Tệp không chứa mật khẩu và việc xuất chưa chuyển dữ liệu lên Supabase.');
      setErrorMsg('');
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Không thể xuất dữ liệu cũ.'); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('Vui lòng nhập Họ tên và Email.');
      return;
    }
    if (regPassword && regPassword.length < 6) {
      setErrorMsg('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword || 'password123',
      role: regRole,
      familyRole: regRole === 'student' ? 'student' : regRole === 'parent' ? regFamilyRole : 'none',
      familyCode: regFamilyCode.trim() || undefined,
      grade: regGrade.trim() || undefined,
      title: regTitle.trim() || undefined,
      phone: regPhone.trim() || undefined,
      bio: regBio.trim() || undefined,
    });

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Đăng ký không thành công.');
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="auth-modal-card"
        className="relative w-full max-w-xl my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white">
          <button
            id="close-auth-modal-btn"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
              <Heart className="w-6 h-6 text-pink-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold tracking-tight">CODE GenZ Family</h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full">
                  Bảo mật SQLite
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 mt-0.5">
                Nền tảng Thấu cảm Cảm xúc & Gắn kết Gia đình Thế hệ Số
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="mt-5 flex p-1 bg-black/20 rounded-xl">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng ký tài khoản</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Alerts */}
          {errorMsg && (
            <div
              id="auth-error-banner"
              className="mb-5 flex items-start space-x-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-shake"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div
              id="auth-success-banner"
              className="mb-5 flex items-start space-x-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {activeTab === 'login' ? (
            /* ================= LOGIN TAB ================= */
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email hoặc Tên người dùng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="login-email-input"
                    type="text"
                    required
                    placeholder="Ví dụ: minhanh.nguyen@student.edu.vn"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Mật khẩu
                    </label>

                  </div>
                  <div className="relative">
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu..."
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập hệ thống</span>
                    </>
                  )}
                </button>
              </form>

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" aria-labelledby="legacy-recovery-title">
                <h3 id="legacy-recovery-title" className="font-semibold text-sm text-amber-950">Đã đăng ký nhưng không đăng nhập được?</h3>
                <p className="text-xs text-amber-900">Bản cũ có thể chỉ lưu tài khoản trên thiết bị đã đăng ký. Hãy mở đúng trình duyệt đó và xuất dữ liệu để chuyển sang Supabase.</p>
                <button type="button" onClick={handleExportLegacy} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-950">Xuất dữ liệu cũ để chuyển Supabase</button>
                {loginEmail.trim().toLowerCase().endsWith('@gmai.com') && <p role="status" className="text-xs text-amber-900">Bạn đang nhập đuôi gmai.com. Nếu dùng Gmail, hãy kiểm tra lại gmail.com; hệ thống giữ nguyên địa chỉ bạn nhập.</p>}
              </section>

            </div>
          ) : (
            /* ================= REGISTER TAB ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  1. Chọn vai trò tài khoản <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegRole('student');
                      setRegFamilyRole('student');
                    }}
                    className={`p-3 text-center rounded-xl border transition-all ${
                      regRole === 'student'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                    <p className="text-xs font-bold">Học sinh</p>
                    <span className="text-[10px] text-slate-500">GenZ THPT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRegRole('parent');
                      setRegFamilyRole('mother');
                    }}
                    className={`p-3 text-center rounded-xl border transition-all ${
                      regRole === 'parent'
                        ? 'bg-pink-50 border-pink-500 text-pink-700 ring-2 ring-pink-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-1 text-pink-600" />
                    <p className="text-xs font-bold">Phụ huynh</p>
                    <span className="text-[10px] text-slate-500">Bố / Mẹ / Giám hộ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRegRole('psychologist');
                      setRegFamilyRole('none');
                    }}
                    className={`p-3 text-center rounded-xl border transition-all ${
                      regRole === 'psychologist'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Stethoscope className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs font-bold">Chuyên gia</p>
                    <span className="text-[10px] text-slate-500">Tâm lý học</span>
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg-name-input"
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Gia Huy"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email đăng ký <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg-email-input"
                    type="email"
                    required
                    placeholder="giahuy@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg-password-input"
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg-confirm-password-input"
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role-Specific Fields */}
              {regRole === 'student' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lớp & Trường THPT
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Lớp 11A1 - THPT Lê Quý Đôn"
                      value={regGrade}
                      onChange={(e) => setRegGrade(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã gia đình kết nối (nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: CODE-8899"
                      value={regFamilyCode}
                      onChange={(e) => setRegFamilyCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {regRole === 'parent' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vai trò trong gia đình
                    </label>
                    <select
                      value={regFamilyRole}
                      onChange={(e) => setRegFamilyRole(e.target.value as FamilyRole)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    >
                      <option value="mother">Mẹ</option>
                      <option value="father">Bố</option>
                      <option value="guardian">Người giám hộ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã gia đình kết nối (nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: CODE-8899"
                      value={regFamilyCode}
                      onChange={(e) => setRegFamilyCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {regRole === 'psychologist' && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Học vị & Chuyên môn
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: ThS. Tâm lý học Lâm sàng Học đường"
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tóm tắt kinh nghiệm tư vấn
                    </label>
                    <input
                      type="text"
                      placeholder="Kinh nghiệm hỗ trợ tâm lý học sinh THPT và gia đình..."
                      value={regBio}
                      onChange={(e) => setRegBio(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                id="btn-submit-register"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Hoàn tất đăng ký & Bắt đầu trải nghiệm</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Dữ liệu được lưu trữ an toàn và phân quyền nghiêm ngặt</span>
          </div>
          <div>
            {activeTab === 'login' ? (
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Đã có tài khoản? Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
