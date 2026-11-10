import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FamilyRole, User } from '../../types';
import {
  Users,
  UserPlus,
  Home,
  Copy,
  Check,
  Share2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Award,
  Flame,
  Mail,
  Phone,
  UserMinus,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit3,
  Trash2,
  Info,
  X,
} from 'lucide-react';
import { CodeGenzLogo, CodeGenzMascot } from '../Logo';
import { SiteShareCard } from '../shared/SiteShareCard';

interface FamilyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'overview' | 'invite' | 'invitations' | 'all_families';
}

export const FamilyManagementModal: React.FC<FamilyManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  const {
    currentUser,
    users,
    family,
    families,
    familyInvitations,
    joinFamilyWithCode,
    createFamily,
    updateFamilyDetails,
    linkUserToFamily,
    removeUserFromFamily,
    sendFamilyInvitation,
    respondToInvitation,
    switchActiveFamily,
    getFamilyMembers,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'invite' | 'invitations' | 'all_families'>(initialTab);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Send invitation state
  const [inviteEmailOrPhone, setInviteEmailOrPhone] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>(
    currentUser.role === 'student' ? 'mother' : 'student'
  );
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create new family state
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyIcon, setNewFamilyIcon] = useState('🏡');
  const [newFamilyDesc, setNewFamilyDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit current family state
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [editName, setEditName] = useState(family.name);
  const [editDesc, setEditDesc] = useState(family.description || '');
  const [editIcon, setEditIcon] = useState(family.avatarIcon || '🏡');

  // Quick link user modal state (Admin or Parent)
  const [selectedUserToLink, setSelectedUserToLink] = useState('');
  const [selectedRoleToLink, setSelectedRoleToLink] = useState<FamilyRole>('student');
  const [linkLoading, setLinkLoading] = useState(false);

  if (!isOpen) return null;

  const currentMembers = getFamilyMembers(family.id);
  const availableIcons = ['🏡', '🌱', '🌻', '🌸', '🌳', '🌟', '❤️', '🕊️', '🏠', '✨'];

  const handleCopyCode = (codeToCopy?: string) => {
    const code = codeToCopy || family.familyCode;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setJoinLoading(true);
    setJoinMessage(null);

    const result = await joinFamilyWithCode(joinCodeInput.trim());
    setJoinLoading(false);
    if (result.success) {
      setJoinMessage({ type: 'success', text: result.message });
      setJoinCodeInput('');
      setTimeout(() => {
        setActiveTab('overview');
        setJoinMessage(null);
      }, 1500);
    } else {
      setJoinMessage({ type: 'error', text: result.message });
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailOrPhone.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);

    const result = await sendFamilyInvitation(inviteEmailOrPhone.trim(), inviteRole);
    setInviteLoading(false);
    if (result.success) {
      setInviteMessage({ type: 'success', text: result.message });
      setInviteEmailOrPhone('');
    } else {
      setInviteMessage({ type: 'error', text: result.message });
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    setCreateLoading(true);
    setCreateSuccess(null);

    const result = await createFamily(newFamilyName.trim(), newFamilyIcon, newFamilyDesc.trim());
    setCreateLoading(false);
    if (result.success) {
      setCreateSuccess(result.message);
      setNewFamilyName('');
      setNewFamilyDesc('');
      setTimeout(() => {
        setCreateSuccess(null);
        setActiveTab('overview');
      }, 1500);
    }
  };

  const handleSaveEditFamily = async () => {
    await updateFamilyDetails(family.id, {
      name: editName,
      description: editDesc,
      avatarIcon: editIcon,
    });
    setIsEditingFamily(false);
  };

  const handleDirectLinkMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToLink) return;
    setLinkLoading(true);
    await linkUserToFamily(family.id, selectedUserToLink, selectedRoleToLink);
    setLinkLoading(false);
    setSelectedUserToLink('');
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (confirm(`Bạn có chắc chắn muốn ngắt kết nối thành viên "${userName}" khỏi nhóm "${family.name}"?`)) {
      await removeUserFromFamily(family.id, userId);
    }
  };

  // Get unlinked users for manual quick-adding
  const unlinkedUsers = users.filter(
    (u) =>
      u.role !== 'admin' &&
      u.role !== 'psychologist' &&
      !currentMembers.students.some((s) => s.id === u.id) &&
      !currentMembers.parents.some((p) => p.id === u.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#831843] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-2xl">
              {family.avatarIcon || '🏡'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-pink-200 border border-white/20">
                  Trung tâm Kết nối Gia đình CODE
                </span>
                <span className="text-xs text-indigo-200 font-mono bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-500/30">
                  {family.familyCode}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                {family.name}
              </h2>
            </div>
          </div>
          <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
            {family.description || 'Không gian gắn kết yêu thương giữa Học sinh Gen Z và Bố Mẹ thông qua triết lý C-O-D-E.'}
          </p>

          {/* Navigation Tabs inside modal */}
          <div className="flex items-center gap-2 mt-5 border-t border-white/10 pt-4 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Thành viên & Sợi dây kết nối
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'invite'
                  ? 'bg-white text-indigo-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Mời & Nhập mã gia đình
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer relative ${
                activeTab === 'invitations'
                  ? 'bg-white text-indigo-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              Lời mời kết nối
              {familyInvitations.filter((i) => i.status === 'pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all_families')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all_families'
                  ? 'bg-white text-indigo-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              Danh sách nhóm ({families.length})
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {/* TAB 1: OVERVIEW & MEMBERS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Điểm Hạnh Phúc</div>
                    <div className="text-xl font-black text-slate-800">{family.happinessPoints} pts</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Chuỗi gắn kết</div>
                    <div className="text-xl font-black text-slate-800">{family.streakDays} ngày liên tiếp</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Mã kết nối</div>
                    <div className="text-base font-black text-indigo-700 font-mono tracking-wider">{family.familyCode}</div>
                  </div>
                  <button
                    onClick={() => handleCopyCode()}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              {/* Edit Family Info Form Toggle */}
              {isEditingFamily ? (
                <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-indigo-600" />
                      Chỉnh sửa thông tin nhóm gia đình
                    </h4>
                    <button
                      onClick={() => setIsEditingFamily(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Hủy
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên tổ ấm gia đình</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Biểu tượng tổ ấm</label>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {availableIcons.map((ico) => (
                          <button
                            key={ico}
                            type="button"
                            onClick={() => setEditIcon(ico)}
                            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                              editIcon === ico ? 'bg-indigo-100 border-2 border-indigo-600 scale-110' : 'bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            {ico}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lời ngỏ / Mô tả gia đình</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSaveEditFamily}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setEditName(family.name);
                      setEditDesc(family.description || '');
                      setEditIcon(family.avatarIcon || '🏡');
                      setIsEditingFamily(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Chỉnh sửa thông tin tổ ấm
                  </button>
                </div>
              )}

              {/* Members Section Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Students / Children */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        🎓
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Con cái / Học sinh</h4>
                        <p className="text-[11px] text-slate-400">
                          {currentMembers.students.length} thành viên học sinh trong nhóm
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Gen Z
                    </span>
                  </div>

                  <div className="space-y-3">
                    {currentMembers.students.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Chưa có học sinh nào kết nối vào nhóm này.
                      </div>
                    ) : (
                      currentMembers.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-10 h-10 rounded-full border-2 border-indigo-200 object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{student.name}</span>
                                {student.id === currentUser.id && (
                                  <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-md">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {student.grade || 'Học sinh THPT'} • {student.email}
                              </div>
                            </div>
                          </div>

                          {(currentUser.role === 'admin' || currentUser.role === 'parent') && (
                            <button
                              onClick={() => handleRemoveMember(student.id, student.name)}
                              title="Ngắt kết nối thành viên"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Parents / Guardians */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                        🌿
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Phụ huynh / Cha mẹ</h4>
                        <p className="text-[11px] text-slate-400">
                          {currentMembers.parents.length} phụ huynh đồng hành
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                      Bố & Mẹ
                    </span>
                  </div>

                  <div className="space-y-3">
                    {currentMembers.parents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Chưa có phụ huynh nào kết nối vào nhóm này.
                      </div>
                    ) : (
                      currentMembers.parents.map((parent) => (
                        <div
                          key={parent.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={parent.avatar}
                              alt={parent.name}
                              className="w-10 h-10 rounded-full border-2 border-rose-200 object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{parent.name}</span>
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800">
                                  {parent.familyRole === 'father' ? 'Bố' : parent.familyRole === 'mother' ? 'Mẹ' : 'Người giám hộ'}
                                </span>
                                {parent.id === currentUser.id && (
                                  <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-md">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {parent.phone || parent.email}
                              </div>
                            </div>
                          </div>

                          {(currentUser.role === 'admin' || (currentUser.role === 'parent' && currentUser.id !== parent.id)) && (
                            <button
                              onClick={() => handleRemoveMember(parent.id, parent.name)}
                              title="Ngắt kết nối thành viên"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Link Unlinked Registered User (For Demo & Admin/Parent Convenience) */}
              {unlinkedUsers.length > 0 && (currentUser.role === 'admin' || currentUser.role === 'parent') && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        Thêm nhanh người dùng có sẵn vào nhóm này
                      </h4>
                    </div>
                    <span className="text-[11px] text-indigo-700">
                      {unlinkedUsers.length} tài khoản chưa tham gia nhóm này
                    </span>
                  </div>

                  <form onSubmit={handleDirectLinkMember} className="flex flex-wrap items-center gap-3">
                    <select
                      value={selectedUserToLink}
                      onChange={(e) => setSelectedUserToLink(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-white border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Chọn thành viên (Học sinh / Phụ huynh) --</option>
                      {unlinkedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'student' ? 'Học sinh' : 'Phụ huynh'}) - {u.email}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedRoleToLink}
                      onChange={(e) => setSelectedRoleToLink(e.target.value as FamilyRole)}
                      className="text-xs px-3 py-2 rounded-xl bg-white border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="student">Vai trò: Con cái (Học sinh)</option>
                      <option value="father">Vai trò: Bố</option>
                      <option value="mother">Vai trò: Mẹ</option>
                      <option value="guardian">Vai trò: Giám hộ</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedUserToLink || linkLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {linkLoading ? 'Đang thêm...' : 'Kết nối ngay'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONNECT & INVITE */}
          {activeTab === 'invite' && (
            <div className="space-y-6">
              {/* Option A: Family Code Sharing */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-pink-200 text-xs font-bold border border-white/10">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Mã gia đình bảo mật
                    </div>
                    <h3 className="text-xl font-black text-white">
                      Mời con cái hoặc cha mẹ tham gia qua QR Code
                    </h3>
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      Chia sẻ mã kết nối dưới đây cho con hoặc bố mẹ của bạn. Khi đăng nhập vào CODE GenZ, thành viên chỉ cần nhập mã này tại mục "Nhập mã kết nối" để tự động liên kết vào tổ ấm chung.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="bg-white/15 border border-white/25 px-5 py-2.5 rounded-2xl flex items-center gap-3">
                        <span className="text-xs text-indigo-300 font-bold uppercase">Mã:</span>
                        <span className="text-2xl font-black tracking-widest text-white font-mono">
                          {family.familyCode}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCode()}
                        className="px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedCode ? 'Đã sao chép mã!' : 'Sao chép mã kết nối'}
                      </button>
                    </div>
                  </div>

                  <SiteShareCard familyCode={family.familyCode} />
                </div>
              </div>

              {/* Option B: Direct Invitation Form */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      Gửi lời mời trực tiếp qua Email hoặc Số điện thoại
                    </h4>
                    <p className="text-xs text-slate-400">
                      Hệ thống sẽ gửi thông báo kết nối tức thì tới tài khoản thành viên
                    </p>
                  </div>
                </div>

                {inviteMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      inviteMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {inviteMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {inviteMessage.text}
                  </div>
                )}

                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email hoặc Số điện thoại người nhận
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: tuan.nguyen@email.com hoặc 0912345678"
                        value={inviteEmailOrPhone}
                        onChange={(e) => setInviteEmailOrPhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mời với vai trò trong gia đình
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white"
                      >
                        <option value="student">Con cái (Học sinh THPT)</option>
                        <option value="father">Bố</option>
                        <option value="mother">Mẹ</option>
                        <option value="guardian">Người giám hộ</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {inviteLoading ? 'Đang gửi lời mời...' : 'Gửi lời mời kết nối'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Option C: Join another family by code */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      Bạn có mã kết nối từ người thân? Nhập mã để tham gia
                    </h4>
                    <p className="text-xs text-slate-400">
                      Nhập mã gia đình (VD: CODE-8899, CODE-5566) để tham gia nhóm tổ ấm của bạn
                    </p>
                  </div>
                </div>

                {joinMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      joinMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {joinMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {joinMessage.text}
                  </div>
                )}

                <form onSubmit={handleJoinWithCode} className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nhập mã (VD: CODE-8899)"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 min-w-[200px] font-mono text-sm uppercase px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !joinCodeInput.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    {joinLoading ? 'Đang kết nối...' : 'Xác nhận tham gia'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Danh sách Lời mời kết nối gia đình</h4>
                  <p className="text-xs text-slate-400">
                    Các lời mời được gửi qua hệ thống CODE GenZ
                  </p>
                </div>
              </div>

              {familyInvitations.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center space-y-3 border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                    📭
                  </div>
                  <div className="text-sm font-bold text-slate-700">Chưa có lời mời kết nối nào</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Bạn có thể gửi lời mời cho con hoặc bố mẹ tại tab "Mời & Nhập mã gia đình".
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {familyInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                          💌
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">
                              Lời mời vào nhóm "{inv.familyName}"
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                inv.status === 'accepted'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : inv.status === 'declined'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              }`}
                            >
                              {inv.status === 'accepted' ? 'Đã chấp nhận' : inv.status === 'declined' ? 'Đã từ chối' : 'Chờ phản hồi'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Người gửi: <span className="font-semibold text-slate-700">{inv.senderName}</span> ({inv.senderRole === 'student' ? 'Con cái' : 'Phụ huynh'}) • Mã: <span className="font-mono text-indigo-600 font-bold">{inv.familyCode}</span> • Gửi tới: {inv.recipientEmailOrPhone}
                          </div>
                        </div>
                      </div>

                      {inv.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => respondToInvitation(inv.id, true)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Đồng ý
                          </button>
                          <button
                            onClick={() => respondToInvitation(inv.id, false)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ALL FAMILIES & CREATE NEW */}
          {activeTab === 'all_families' && (
            <div className="space-y-6">
              {/* Create New Family Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tạo một nhóm gia đình mới
                  </h4>
                </div>

                {createSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {createSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateFamily} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên tổ ấm mới</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Gia Đình Hạnh Phúc Tuấn - Mai"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Chọn biểu tượng</label>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {availableIcons.map((ico) => (
                          <button
                            key={ico}
                            type="button"
                            onClick={() => setNewFamilyIcon(ico)}
                            className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                              newFamilyIcon === ico ? 'bg-indigo-100 border-2 border-indigo-600 scale-110' : 'bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            {ico}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả / Lời ngỏ gia đình</label>
                    <textarea
                      placeholder="VD: Nơi chia sẻ cởi mở, lắng nghe không phán xét giữa con cái và bố mẹ."
                      value={newFamilyDesc}
                      onChange={(e) => setNewFamilyDesc(e.target.value)}
                      rows={2}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={createLoading || !newFamilyName.trim()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {createLoading ? 'Đang tạo...' : 'Tạo nhóm gia đình mới'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of All Families in the System */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Các nhóm gia đình trong hệ thống ({families.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {families.map((fam) => {
                    const members = getFamilyMembers(fam.id);
                    const isCurrent = family.id === fam.id;

                    return (
                      <div
                        key={fam.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-xl flex items-center justify-center shadow-2xs">
                              {fam.avatarIcon || '🏡'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-black text-slate-800">{fam.name}</h5>
                                {isCurrent && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-indigo-600 text-white">
                                    Đang chọn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-indigo-700 font-bold">
                                {fam.familyCode}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyCode(fam.familyCode)}
                              title="Sao chép mã"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {!isCurrent && (
                              <button
                                onClick={() => switchActiveFamily(fam.id)}
                                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                              >
                                Xem nhóm
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-2.5 line-clamp-2">
                          {fam.description || 'Tổ ấm gia đình yêu thương trên CODE GenZ.'}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>🎓 {members.students.length} Học sinh</span>
                            <span>•</span>
                            <span>🌿 {members.parents.length} Phụ huynh</span>
                          </div>
                          <div className="font-bold text-pink-600">{fam.happinessPoints} pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
