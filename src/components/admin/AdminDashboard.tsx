import React, { useState, useCallback, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  ShieldAlert,
  Users,
  BookOpen,
  Stethoscope,
  Award,
  CalendarCheck2,
  HeartHandshake,
  CheckCircle2,
  Plus,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  KeyRound,
  Edit3,
  Trash2,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  UserPlus,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { User, UserRole, FamilyRole, UserPermissions } from "../../types";

export const AdminDashboard: React.FC = () => {
  const {
    users,
    currentUser,
    family,
    journalEntries,
    consultations,
    challengeTasks,
    deepTalkTopics,
    auditLogs,
    adminAddChallengeTask,
    adminAddDeepTalkTopic,
    adminCreateUser,
    reloadAdminUsers,
    adminUpdateUser,
    adminToggleUserStatus,
    adminResetPassword,
    adminDeleteUser,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<
    "overview" | "pending" | "users" | "challenges" | "deeptalk" | "audit"
  >("overview");

  // User Management State
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try { await reloadAdminUsers(); }
    catch (error) { setUsersError(error instanceof Error ? error.message : "Không thể tải danh sách người dùng."); }
    finally { setUsersLoading(false); }
  }, [reloadAdminUsers]);
  useEffect(() => { void loadUsers(); }, [loadUsers]);
  const pendingUsers = users.filter((user) => user.status === "pending");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | UserRole>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("student");
  const [newUserFamilyRole, setNewUserFamilyRole] =
    useState<FamilyRole>("student");
  const [newUserGrade, setNewUserGrade] = useState("");
  const [newUserTitle, setNewUserTitle] = useState("");
  const [newUserBio, setNewUserBio] = useState("");
  const [newUserPermissions, setNewUserPermissions] = useState<UserPermissions>(
    {
      canCreateJournal: true,
      canViewFamilyJournals: true,
      canRequestConsultation: true,
      canManageConsultations: false,
      canManageChallenges: false,
      canManageDeeptalk: false,
      canManageUsers: false,
      canAuditLogs: false,
      canExportDatabase: false,
    },
  );

  // Edit User Permissions State
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});

  // Challenge Form State
  const [showAddChallenge, setShowAddChallenge] = useState(false);
  const [newDay, setNewDay] = useState(31);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStudentAct, setNewStudentAct] = useState("");
  const [newParentAct, setNewParentAct] = useState("");

  const showBanner = (type: "success" | "error", text: string) => {
    setNotificationBanner({ type, text });
    setTimeout(() => setNotificationBanner(null), 4000);
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    adminAddChallengeTask({
      day: newDay,
      stage: 4,
      stageName: "GĐ Mở Rộng: Gắn Kết Nâng Cao",
      title: newTitle,
      description: newDesc,
      icon: "✨",
      studentAction: newStudentAct,
      parentAction: newParentAct,
      points: 30,
    });
    setShowAddChallenge(false);
    setNewTitle("");
    setNewDesc("");
    setNewStudentAct("");
    setNewParentAct("");
    showBanner("success", "Đã thêm nhiệm vụ thử thách mới thành công.");
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showBanner("error", "Vui lòng nhập Họ tên và Email.");
      return;
    }

    const res = await adminCreateUser({
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      password: newUserPassword,
      role: newUserRole,
      familyRole: newUserFamilyRole,
      grade: newUserGrade || undefined,
      title: newUserTitle || undefined,
      bio: newUserBio || undefined,
      status: "active",
      verified: true,
      permissions: newUserPermissions,
    });

    if (res.success) {
      showBanner("success", `Đã tạo tài khoản ${newUserName} thành công.`);
      setShowAddUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserGrade("");
      setNewUserTitle("");
      setNewUserBio("");
    } else {
      showBanner("error", res.error || "Lỗi tạo tài khoản.");
    }
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditPermissions(
      user.permissions || {
        canCreateJournal: true,
        canViewFamilyJournals: true,
        canRequestConsultation:
          user.role === "student" || user.role === "admin",
        canManageConsultations:
          user.role === "psychologist" || user.role === "admin",
        canManageChallenges: user.role === "admin",
        canManageDeeptalk: user.role === "admin",
        canManageUsers: user.role === "admin",
        canAuditLogs: user.role === "admin",
        canExportDatabase: user.role === "admin",
      },
    );
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const res = await adminUpdateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      familyRole: editingUser.familyRole,
      grade: editingUser.grade,
      title: editingUser.title,
      bio: editingUser.bio,
      permissions: editPermissions,
    });

    if (res.success) {
      showBanner(
        "success",
        `Đã cập nhật thông tin & phân quyền cho ${editingUser.name}.`,
      );
      setEditingUser(null);
    } else {
      showBanner("error", res.error || "Lỗi cập nhật người dùng.");
    }
  };

  const handleToggleLock = async (user: User) => {
    if (statusBusyId) return;
    const newStatus = user.status === "active" ? "locked" : "active";
    setStatusBusyId(user.id);
    try {
      const res = await adminToggleUserStatus(user.id, newStatus);
      if (res.success) {
        showBanner("success", user.status === "pending"
          ? `Đã duyệt và kích hoạt tài khoản ${user.name}.`
          : `Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} tài khoản ${user.name}.`);
      } else showBanner("error", res.error || "Lỗi đổi trạng thái.");
    } finally { setStatusBusyId(null); }
  };

  const handleResetUserPass = (user: User) => {
    setPasswordTarget(user);
    setResetPassword("");
    setConfirmPassword("");
  };
  const submitPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget || resetBusy) return;
    if (resetPassword.length < 10 || resetPassword !== confirmPassword) {
      showBanner(
        "error",
        "Mật khẩu cần từ 10 ký tự và xác nhận phải trùng khớp.",
      );
      return;
    }
    setResetBusy(true);
    const result = await adminResetPassword(passwordTarget.id, resetPassword);
    setResetBusy(false);
    if (result.success) {
      setPasswordTarget(null);
      setResetPassword("");
      setConfirmPassword("");
      showBanner(
        "success",
        "Đã đặt lại mật khẩu và thu hồi phiên đăng nhập. Người dùng phải đổi mật khẩu ở lần đăng nhập tiếp theo.",
      );
    } else showBanner("error", result.error || "Không thể đặt lại mật khẩu.");
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert("Không thể xóa tài khoản Admin đang đăng nhập.");
      return;
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.name}" (${user.email}) khỏi hệ thống không? Lịch sử liên quan sẽ được giữ để tránh mất dữ liệu.`,
      )
    ) {
      return;
    }
    const res = await adminDeleteUser(user.id);
    if (res.success) {
      showBanner("success", `Đã xóa tài khoản ${user.name}.`);
    } else {
      showBanner("error", res.error || "Lỗi xóa tài khoản.");
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.grade &&
        u.grade.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      (u.title && u.title.toLowerCase().includes(userSearchTerm.toLowerCase()));
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return (
      matchSearch &&
      matchRole &&
      ((activeAdminTab === "pending" ? "pending" : statusFilter) === "all" ||
       (u.status || "active") === (activeAdminTab === "pending" ? "pending" : statusFilter))
    );
  });

  const selectAdminTab = (tab: typeof activeAdminTab) => {
    setActiveAdminTab(tab);
    if (tab === "pending" || tab === "users") {
      setUserSearchTerm("");
      setUserRoleFilter("all");
      setStatusFilter("all");
    }
  };

  if (currentUser.role !== "admin")
    return <p role="alert">Bạn không có quyền truy cập quản trị người dùng.</p>;
  return (
    <div className="space-y-8">
      {/* Top Admin Header */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-300 border border-white/15 backdrop-blur-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-pink-300 mb-1">
                SYSTEM CONTROLLER
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Trung tâm quản trị hệ thống CODE GenZ
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 mt-1 font-normal leading-relaxed">
                Giám sát vận hành, quản lý ngân hàng thử thách, kiểm duyệt
                chuyên gia & kiểm toán an ninh
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "overview", label: "Tổng quan chỉ số" },
          { id: "pending", label: `Chờ duyệt (${usersLoading ? "…" : usersError ? "!" : pendingUsers.length})` },
          { id: "users", label: `Người dùng (${usersLoading ? "…" : usersError ? "!" : users.length})` },
          {
            id: "challenges",
            label: `Thử thách 30 ngày (${challengeTasks.length})`,
          },
          {
            id: "deeptalk",
            label: `Chủ đề Deep Talk (${deepTalkTopics.length})`,
          },
          { id: "audit", label: `Kiểm toán bảo mật (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectAdminTab(tab.id as typeof activeAdminTab)}
            aria-pressed={activeAdminTab === tab.id}
            className={`px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeAdminTab === tab.id
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-purple-100/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeAdminTab === "overview" && (
        <div className="space-y-6">
          <button
            onClick={() => selectAdminTab("pending")}
            className="w-full flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left hover:bg-amber-100"
          >
            <span><strong className="block text-amber-900">Tài khoản chờ phê duyệt</strong><span className="text-sm text-amber-800">Xem đăng ký mới và duyệt để kích hoạt tài khoản.</span></span>
            <span className="rounded-xl bg-white px-4 py-2 text-2xl font-bold text-amber-800">{usersLoading ? "…" : usersError ? "!" : pendingUsers.length}</span>
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs hover:border-purple-200 transition-all">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Tổng người dùng
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {users.length}
              </div>
              <span className="text-xs text-purple-700 font-bold mt-1 block">
                Học sinh, Cha mẹ, Chuyên gia
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs hover:border-purple-200 transition-all">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Nhật ký cảm xúc
              </span>
              <div className="text-3xl font-extrabold text-pink-600 mt-2">
                {journalEntries.length}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Được bảo vệ quyền riêng tư
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs hover:border-purple-200 transition-all">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Phiên tham vấn
              </span>
              <div className="text-3xl font-extrabold text-indigo-600 mt-2">
                {consultations.length}
              </div>
              <span className="text-xs text-indigo-600 font-bold mt-1 block">
                Tâm lý học đường
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs hover:border-purple-200 transition-all">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Điểm hạnh phúc
              </span>
              <div className="text-3xl font-extrabold text-amber-600 mt-2">
                {family.happinessPoints}
              </div>
              <span className="text-xs text-amber-700 font-bold mt-1 block">
                Quỹ điểm gia đình
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notificationBanner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            notificationBanner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationBanner.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notificationBanner.text}</span>
          </div>
          <button
            onClick={() => setNotificationBanner(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 2: Users & RBAC Management */}
      {(activeAdminTab === "users" || activeAdminTab === "pending") && (
        <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                {activeAdminTab === "pending" ? "Danh sách tài khoản chờ duyệt" : "Quản lý & phân quyền người dùng (RBAC)"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem danh sách, tạo mới, chỉnh sửa thông tin, đặt lại mật khẩu và
                cấp quyền chi tiết trong hệ thống
              </p>
            </div>

            <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadUsers()} disabled={usersLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} /> Làm mới
            </button>
            <button
              id="admin-add-user-btn"
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm người dùng mới</span>
            </button>
            </div>
          </div>

          {usersLoading && <p role="status" className="text-sm text-slate-600">Đang tải danh sách tài khoản từ Supabase...</p>}
          {usersError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{usersError} Nhấn Làm mới để thử lại.</p>}
          {activeAdminTab === "pending" && <p className="text-sm text-slate-600">Duyệt tài khoản để xác nhận email và cho phép đăng nhập hệ thống.</p>}
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, lớp học, học vị..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
              />
            </div>

            {activeAdminTab !== "pending" && <label className="text-xs text-slate-600">
              Trạng thái
              <select
                aria-label="Lọc trạng thái tài khoản"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="ml-2 rounded-lg border border-slate-300 p-2"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã vô hiệu hóa</option>
                <option value="pending">Chờ duyệt</option>
              </select>
            </label>}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(
                ["all", "student", "parent", "psychologist", "admin"] as const
              ).map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === role
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {role === "all"
                    ? "Tất cả vai trò"
                    : role === "student"
                      ? "Học sinh"
                      : role === "parent"
                        ? "Phụ huynh"
                        : role === "psychologist"
                          ? "Chuyên gia"
                          : "Admin"}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Người dùng & Email</th>
                  <th className="p-3.5">Vai trò</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Quyền hạn (RBAC)</th>
                  <th className="p-3.5 text-right">Thao tác quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usersLoading || usersError ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">{usersLoading ? "Đang tải tài khoản..." : "Chưa tải được danh sách tài khoản."}</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400 italic"
                    >
                      {activeAdminTab === "pending" && !userSearchTerm && userRoleFilter === "all" ? "Không có tài khoản nào đang chờ duyệt." : "Không tìm thấy người dùng phù hợp với tiêu chí lọc."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isLocked = u.status === "locked";
                    const activePermCount = u.permissions
                      ? Object.values(u.permissions).filter(Boolean).length
                      : 0;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 transition-colors ${isLocked ? "bg-rose-50/30" : ""}`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-purple-100 shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate">
                                  {u.name}
                                </span>
                                {u.id === currentUser.id && (
                                  <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {u.email}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {u.grade ||
                                  u.title ||
                                  (u.role === "parent"
                                    ? u.familyRole === "father"
                                      ? "Bố"
                                      : "Mẹ"
                                    : "Hệ thống")}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`font-extrabold uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-full border ${
                              u.role === "student"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : u.role === "parent"
                                  ? "bg-pink-50 text-pink-700 border-pink-200"
                                  : u.role === "psychologist"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {u.role === "student"
                              ? "Học sinh"
                              : u.role === "parent"
                                ? "Phụ huynh"
                                : u.role === "psychologist"
                                  ? "Chuyên gia"
                                  : "Admin"}
                          </span>
                        </td>

                        <td className="p-3.5">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3 text-rose-600" /> Bị khóa
                            </span>
                          ) : u.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"><Clock3 className="h-3 w-3" /> Chờ duyệt</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                              Hoạt động
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {activePermCount} quyền cấp phép
                            </span>
                            {u.permissions?.canManageUsers && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">
                                Admin User
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit & Permissions */}
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                              title="Chỉnh sửa thông tin & Phân quyền"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => handleResetUserPass(u)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                              title="Đặt lại mật khẩu tài khoản"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {/* Lock / Unlock */}
                            <button
                              onClick={() => handleToggleLock(u)}
                              className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                                isLocked
                                  ? "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200"
                                  : "text-amber-600 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-200"
                              }`}
                              disabled={u.id === currentUser.id || statusBusyId !== null || usersLoading}
                              aria-label={u.status === "pending" ? `Duyệt tài khoản ${u.email}` : undefined}
                              title={
                                u.status === "pending"
                                  ? "Duyệt và kích hoạt tài khoản"
                                  : isLocked
                                    ? "Enable: mở khóa tài khoản"
                                    : "Disable: khóa tài khoản"
                              }
                            >
                              {u.status === "pending" ? (
                                <span className="inline-flex items-center gap-1.5 px-2 font-bold text-emerald-700"><UserCheck className="h-4 w-4" />{statusBusyId === u.id ? "Đang duyệt..." : "Duyệt tài khoản"}</span>
                              ) : isLocked ? (
                                <Unlock className="w-4 h-4" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete User */}
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="Xóa tài khoản khỏi hệ thống"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {passwordTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          <form
            onSubmit={submitPasswordReset}
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4"
          >
            <h2 id="reset-password-title" className="font-bold">
              Đặt lại mật khẩu cho {passwordTarget.name}
            </h2>
            <p className="text-sm text-slate-600">
              Các phiên đăng nhập sẽ bị thu hồi. Người dùng cần đổi mật khẩu khi
              đăng nhập lại.
            </p>
            <label className="block text-sm">
              Mật khẩu tạm thời
              <input
                autoFocus
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="block w-full mt-1 rounded-lg border p-3"
              />
            </label>
            <label className="block text-sm">
              Xác nhận mật khẩu
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full mt-1 rounded-lg border p-3"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={resetBusy}
                onClick={() => {
                  setPasswordTarget(null);
                  setResetPassword("");
                  setConfirmPassword("");
                }}
              >
                Hủy
              </button>
              <button
                disabled={resetBusy}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2"
              >
                {resetBusy ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      )}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Thêm tài khoản người dùng mới
                </h3>
                <p className="text-xs text-purple-100 mt-0.5">
                  Tạo tài khoản & thiết lập phân quyền trực tiếp vào Supabase
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateUserSubmit}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Trần Quốc Bảo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="bao.tran@school.edu.vn"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mật khẩu ban đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Vai trò hệ thống <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setNewUserRole(r);
                      if (r === "admin") {
                        setNewUserPermissions({
                          canCreateJournal: true,
                          canViewFamilyJournals: true,
                          canRequestConsultation: true,
                          canManageConsultations: true,
                          canManageChallenges: true,
                          canManageDeeptalk: true,
                          canManageUsers: true,
                          canAuditLogs: true,
                          canExportDatabase: true,
                        });
                      } else if (r === "psychologist") {
                        setNewUserPermissions({
                          canCreateJournal: true,
                          canViewFamilyJournals: false,
                          canRequestConsultation: false,
                          canManageConsultations: true,
                          canManageChallenges: false,
                          canManageDeeptalk: false,
                          canManageUsers: false,
                          canAuditLogs: false,
                          canExportDatabase: false,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800 font-semibold"
                  >
                    <option value="student">🎓 Học sinh THPT</option>
                    <option value="parent">👨‍👩‍👧 Phụ huynh gia đình</option>
                    <option value="psychologist">🩺 Chuyên gia Tâm lý</option>
                    <option value="admin">⚡ Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              {newUserRole === "student" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lớp & Trường học
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lớp 10A2 - THPT Chuyên Hà Nội - Amsterdam"
                    value={newUserGrade}
                    onChange={(e) => setNewUserGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              )}

              {newUserRole === "psychologist" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Học vị & Lĩnh vực chuyên môn
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: TS. Tâm lý học Lâm sàng Trẻ em & Vị thành niên"
                    value={newUserTitle}
                    onChange={(e) => setNewUserTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              )}

              {/* Permissions Checkbox Grid */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-2">
                  Phân quyền chức năng (RBAC Permissions)
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canCreateJournal}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canCreateJournal: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Tạo nhật ký cảm xúc
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canViewFamilyJournals}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canViewFamilyJournals: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Xem nhật ký gia đình
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canRequestConsultation}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canRequestConsultation: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Gửi yêu cầu tham vấn
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canManageConsultations}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canManageConsultations: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Phản hồi ca tham vấn
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canManageChallenges}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canManageChallenges: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Quản lý Thử thách 30 ngày
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canManageDeeptalk}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canManageDeeptalk: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Quản lý Deep Talk
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canManageUsers}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canManageUsers: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-purple-700 font-bold">
                      Quản trị & Phân quyền user
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newUserPermissions.canExportDatabase}
                      onChange={(e) =>
                        setNewUserPermissions({
                          ...newUserPermissions,
                          canExportDatabase: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Xuất/Nhập Database Supabase
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER & PERMISSIONS */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Chỉnh sửa & Phân quyền: {editingUser.name}
                </h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  {editingUser.email}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveEditUser}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Vai trò
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value as UserRole,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800 font-semibold"
                  >
                    <option value="student">🎓 Học sinh THPT</option>
                    <option value="parent">👨‍👩‍👧 Phụ huynh gia đình</option>
                    <option value="psychologist">🩺 Chuyên gia Tâm lý</option>
                    <option value="admin">⚡ Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Thông tin phụ (Lớp / Học vị)
                  </label>
                  <input
                    type="text"
                    value={editingUser.grade || editingUser.title || ""}
                    onChange={(e) => {
                      if (editingUser.role === "student") {
                        setEditingUser({
                          ...editingUser,
                          grade: e.target.value,
                        });
                      } else {
                        setEditingUser({
                          ...editingUser,
                          title: e.target.value,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              {/* Permissions Checkbox Grid */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-2">
                  Quyền truy cập & thao tác (RBAC Matrix)
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canCreateJournal}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canCreateJournal: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Tạo nhật ký cảm xúc
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canViewFamilyJournals}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canViewFamilyJournals: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Xem nhật ký gia đình
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canRequestConsultation}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canRequestConsultation: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Gửi yêu cầu tham vấn
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canManageConsultations}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canManageConsultations: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Phản hồi ca tham vấn
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canManageChallenges}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canManageChallenges: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Quản lý Thử thách 30 ngày
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canManageDeeptalk}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canManageDeeptalk: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Quản lý Deep Talk
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canManageUsers}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canManageUsers: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-purple-700 font-bold">
                      Quản trị & Phân quyền user
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canExportDatabase}
                      onChange={(e) =>
                        setEditPermissions({
                          ...editPermissions,
                          canExportDatabase: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-700">
                      Xuất/Nhập Database Supabase
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu thay đổi & Cập nhật quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Challenges */}
      {activeAdminTab === "challenges" && (
        <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">
              Ngân hàng Thử thách 30 Ngày
            </h3>
            <button
              onClick={() => setShowAddChallenge(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ thử thách
            </button>
          </div>

          {showAddChallenge && (
            <form
              onSubmit={handleCreateChallenge}
              className="p-5 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-3.5 text-xs"
            >
              <h4 className="font-extrabold text-slate-900 text-sm">
                Thêm nhiệm vụ mới vào ngân hàng thử thách
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Tiêu đề thử thách..."
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-hidden focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="Mô tả..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-hidden focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Hành động của học sinh..."
                  value={newStudentAct}
                  onChange={(e) => setNewStudentAct(e.target.value)}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-hidden focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="Hành động của cha mẹ..."
                  value={newParentAct}
                  onChange={(e) => setNewParentAct(e.target.value)}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-hidden focus:border-purple-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChallenge(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 font-bold uppercase tracking-wider text-[10px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-extrabold uppercase tracking-wider text-[10px] shadow-xs"
                >
                  Lưu nhiệm vụ
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {challengeTasks.map((t) => (
              <div
                key={t.day}
                className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-purple-700 mr-2">
                    Ngày {t.day}:
                  </span>
                  <span className="font-bold text-slate-900">{t.title}</span>
                  <p className="text-slate-600 line-clamp-1 mt-0.5">
                    {t.description}
                  </p>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                  +{t.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeAdminTab === "audit" && (
        <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-600" />
            Nhật ký kiểm toán an ninh & Phân quyền bảo mật
          </h3>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-indigo-700">
                      [{log.action}]
                    </span>
                    <span className="font-bold text-slate-900">
                      {log.userName} ({log.userRole})
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                  {new Date(log.timestamp).toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
