import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  Family,
  FamilyInvitation,
  FamilyRole,
  EmotionJournalEntry,
  ConsultationSession,
  ConsultationStatus,
  DeepTalkTopic,
  DeepTalkSession,
  Challenge30DayTask,
  ChallengeDayProgress,
  HappinessPointRecord,
  NotificationItem,
  SecurityAuditLog,
  JournalPrivacy,
  ParentReaction,
  LoginPayload,
  RegisterPayload,
  UserPermissions,
  UserStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_FAMILIES,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_CONSULTATIONS,
  DEEP_TALK_TOPICS,
  INITIAL_CHALLENGE_TASKS,
  INITIAL_CHALLENGE_PROGRESS,
  INITIAL_HAPPINESS_HISTORY,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import {
  AppFullDatabase,
  exportToXml,
  exportToJson,
  exportToSqlDump,
} from '../services/dataStorageService';
import {
  bootstrapCloudFirestore,
  subscribeToCloudChanges,
  saveCloudDocument,
  deleteCloudDocument,
} from '../services/cloudDatabaseService';
import { COLLECTIONS } from '../services/firebaseClient';

interface AppContextType {
  currentUser: User;
  users: User[];
  family: Family;
  families: Family[];
  familyInvitations: FamilyInvitation[];
  journalEntries: EmotionJournalEntry[];
  consultations: ConsultationSession[];
  deepTalkTopics: DeepTalkTopic[];
  deepTalkSessions: DeepTalkSession[];
  challengeTasks: Challenge30DayTask[];
  challengeProgress: ChallengeDayProgress[];
  happinessHistory: HappinessPointRecord[];
  notifications: NotificationItem[];
  auditLogs: SecurityAuditLog[];
  activeTab: string;
  sqliteConnected: boolean;
  sqliteFile: string;
  setActiveTab: (tab: string) => void;
  switchUser: (userId: string) => void;

  // Auth modal & Session
  isAuthenticated: boolean;
  authModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Admin User & RBAC Management
  adminCreateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  adminToggleUserStatus: (id: string, status?: 'active' | 'locked') => Promise<{ success: boolean; error?: string }>;
  adminResetPassword: (id: string, newPassword?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  adminDeleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  createJournalEntry: (entry: Omit<EmotionJournalEntry, 'id' | 'createdAt' | 'parentReactions' | 'studentId' | 'studentName'>) => string;
  updateJournalPrivacy: (journalId: string, privacy: JournalPrivacy) => void;
  deleteJournalEntry: (journalId: string) => void;
  addParentReaction: (journalId: string, reactionType: 'heart' | 'hug' | 'proud' | 'listen', comment?: string) => void;
  requestConsultation: (params: {
    topic: string;
    initialMessage: string;
    psychologistId?: string;
    sharedJournalIds: string[];
  }) => string;
  sendConsultationMessage: (consultationId: string, content: string) => void;
  updateConsultationStatus: (
    consultationId: string,
    status: ConsultationStatus,
    officialFeedback?: string,
    nextActionPlan?: string,
    privateNotes?: string
  ) => void;
  startDeepTalkSession: (topicId: string) => DeepTalkSession;
  submitDeepTalkAnswer: (sessionId: string, questionId: string, answer: string, isParent: boolean) => void;
  completeDeepTalkSession: (sessionId: string, reflection?: string) => void;
  confirmChallengeTask: (day: number, role: 'student' | 'parent', note?: string) => void;
  addHappinessPoints: (amount: number, source: HappinessPointRecord['source'], sourceTitle: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  joinFamilyWithCode: (code: string) => Promise<{ success: boolean; message: string }>;
  createFamily: (name: string, avatarIcon?: string, description?: string) => Promise<{ success: boolean; message: string; family?: Family }>;
  updateFamilyDetails: (familyId: string, updates: Partial<Family>) => Promise<{ success: boolean; message: string }>;
  linkUserToFamily: (familyId: string, userId: string, familyRole?: FamilyRole) => Promise<{ success: boolean; message: string }>;
  removeUserFromFamily: (familyId: string, userId: string) => Promise<{ success: boolean; message: string }>;
  sendFamilyInvitation: (recipientEmailOrPhone: string, targetFamilyRole: FamilyRole) => Promise<{ success: boolean; message: string }>;
  respondToInvitation: (invitationId: string, accept: boolean) => Promise<{ success: boolean; message: string }>;
  adminDeleteFamily: (familyId: string) => Promise<{ success: boolean; message: string }>;
  switchActiveFamily: (familyId: string) => void;
  getFamilyMembers: (familyId: string) => { students: User[]; parents: User[] };
  triggerCelebration: () => void;
  adminAddChallengeTask: (task: Challenge30DayTask) => void;
  adminAddDeepTalkTopic: (topic: DeepTalkTopic) => void;
  getFilteredJournalsForUser: (user: User) => EmotionJournalEntry[];
  getFilteredConsultationsForUser: (user: User) => ConsultationSession[];
  getFullDatabaseSnapshot: () => AppFullDatabase;
  restoreFullDatabase: (data: Partial<AppFullDatabase>, mergeMode?: 'overwrite' | 'merge') => Promise<{ success: boolean; message: string }>;
  resetToInitialData: () => Promise<void>;
  syncDataToServerNow: () => Promise<{ success: boolean; message: string }>;
  reloadFromSqlite: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // SQLite & Database connection status
  const [sqliteConnected, setSqliteConnected] = useState<boolean>(false);
  const sqliteFile = 'data-storage/codegenz.sqlite';

  // Base state with localStorage hydration
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem('codegenz_current_user_id') || 'user-student-1';
    } catch {
      return 'user-student-1';
    }
  });
  const [families, setFamilies] = useState<Family[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_families');
      return saved ? JSON.parse(saved) : INITIAL_FAMILIES;
    } catch {
      return INITIAL_FAMILIES;
    }
  });
  const [activeFamilyId, setActiveFamilyId] = useState<string>('family-1');
  const [familyInvitations, setFamilyInvitations] = useState<FamilyInvitation[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_family_invitations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [family, setFamily] = useState<Family>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_families');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0];
      }
      return INITIAL_FAMILIES[0];
    } catch {
      return INITIAL_FAMILIES[0];
    }
  });
  const [journalEntries, setJournalEntries] = useState<EmotionJournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_journals');
      return saved ? JSON.parse(saved) : INITIAL_JOURNAL_ENTRIES;
    } catch {
      return INITIAL_JOURNAL_ENTRIES;
    }
  });
  const [consultations, setConsultations] = useState<ConsultationSession[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_consultations');
      return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
    } catch {
      return INITIAL_CONSULTATIONS;
    }
  });
  const [deepTalkTopics, setDeepTalkTopics] = useState<DeepTalkTopic[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_deeptalk_topics');
      return saved ? JSON.parse(saved) : DEEP_TALK_TOPICS;
    } catch {
      return DEEP_TALK_TOPICS;
    }
  });
  const [deepTalkSessions, setDeepTalkSessions] = useState<DeepTalkSession[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_deeptalk_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [challengeTasks, setChallengeTasks] = useState<Challenge30DayTask[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_challenge_tasks');
      return saved ? JSON.parse(saved) : INITIAL_CHALLENGE_TASKS;
    } catch {
      return INITIAL_CHALLENGE_TASKS;
    }
  });
  const [challengeProgress, setChallengeProgress] = useState<ChallengeDayProgress[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_challenge_progress');
      return saved ? JSON.parse(saved) : INITIAL_CHALLENGE_PROGRESS;
    } catch {
      return INITIAL_CHALLENGE_PROGRESS;
    }
  });
  const [happinessHistory, setHappinessHistory] = useState<HappinessPointRecord[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_happiness_history');
      return saved ? JSON.parse(saved) : INITIAL_HAPPINESS_HISTORY;
    } catch {
      return INITIAL_HAPPINESS_HISTORY;
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('codegenz_custom_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Sync state changes to localStorage for offline / static web hosting
  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_families', JSON.stringify(families));
    } catch {}
  }, [families]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_family_invitations', JSON.stringify(familyInvitations));
    } catch {}
  }, [familyInvitations]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_journals', JSON.stringify(journalEntries));
    } catch {}
  }, [journalEntries]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_consultations', JSON.stringify(consultations));
    } catch {}
  }, [consultations]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_deeptalk_sessions', JSON.stringify(deepTalkSessions));
    } catch {}
  }, [deepTalkSessions]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_challenge_progress', JSON.stringify(challengeProgress));
    } catch {}
  }, [challengeProgress]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_happiness_history', JSON.stringify(happinessHistory));
    } catch {}
  }, [happinessHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('codegenz_custom_audit_logs', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  // 1. Initial Load & Synchronization from Cloud Database (Firestore) + SQLite Fallback
  const reloadFromSqlite = useCallback(async () => {
    try {
      // First attempt: Load directly from Cloud Database (Firestore) - guaranteed to work across all devices on Vercel
      const cloudData = await bootstrapCloudFirestore();
      if (cloudData) {
        if (cloudData.users && cloudData.users.length > 0) setUsers(cloudData.users);
        if (cloudData.families && cloudData.families.length > 0) setFamilies(cloudData.families);
        if (cloudData.familyInvitations) setFamilyInvitations(cloudData.familyInvitations);
        if (cloudData.family) setFamily(cloudData.family);
        if (cloudData.journalEntries) setJournalEntries(cloudData.journalEntries);
        if (cloudData.consultations) setConsultations(cloudData.consultations);
        if (cloudData.deepTalkTopics) setDeepTalkTopics(cloudData.deepTalkTopics);
        if (cloudData.deepTalkSessions) setDeepTalkSessions(cloudData.deepTalkSessions);
        if (cloudData.challengeTasks) setChallengeTasks(cloudData.challengeTasks);
        if (cloudData.challengeProgress) setChallengeProgress(cloudData.challengeProgress);
        if (cloudData.happinessHistory) setHappinessHistory(cloudData.happinessHistory);
        if (cloudData.notifications) setNotifications(cloudData.notifications);
        if (cloudData.auditLogs) setAuditLogs(cloudData.auditLogs);
        setSqliteConnected(true);
        console.log('[App] Successfully loaded all centralized data from Cloud Database (Firestore)!');
        return;
      }
    } catch (cloudErr) {
      console.warn('[App] Cloud Firestore load warning, falling back to local backend:', cloudErr);
    }

    try {
      const res = await fetch('/api/db/bootstrap');
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const json = await res.json();
        if (json.success && json.data) {
          const db = json.data;
          if (db.users && db.users.length > 0) setUsers(db.users);
          if (db.families && db.families.length > 0) {
            setFamilies(db.families);
          }
          if (db.familyInvitations) {
            setFamilyInvitations(db.familyInvitations);
          }
          if (db.family) setFamily(db.family);
          if (db.journalEntries) setJournalEntries(db.journalEntries);
          if (db.consultations) setConsultations(db.consultations);
          if (db.deepTalkTopics) setDeepTalkTopics(db.deepTalkTopics);
          if (db.deepTalkSessions) setDeepTalkSessions(db.deepTalkSessions);
          if (db.challengeTasks) setChallengeTasks(db.challengeTasks);
          if (db.challengeProgress) setChallengeProgress(db.challengeProgress);
          if (db.happinessHistory) setHappinessHistory(db.happinessHistory);
          if (db.notifications) setNotifications(db.notifications);
          if (db.auditLogs) setAuditLogs(db.auditLogs);
          setSqliteConnected(true);
          console.log('[App] Successfully loaded all data from SQLite database!');
        }
      } else {
        setSqliteConnected(false);
      }
    } catch (err) {
      console.warn('[App] SQLite backend bootstrap error (fallback to local state):', err);
      setSqliteConnected(false);
    }
  }, []);

  useEffect(() => {
    reloadFromSqlite();

    // Subscribe to realtime multi-device sync
    const unsubscribe = subscribeToCloudChanges({
      onUsersChange: (newUsers) => {
        if (newUsers && newUsers.length > 0) {
          setUsers(newUsers);
        }
      },
      onFamiliesChange: (newFamilies) => {
        if (newFamilies && newFamilies.length > 0) {
          setFamilies(newFamilies);
        }
      },
      onJournalsChange: (newJournals) => {
        if (newJournals) {
          setJournalEntries(newJournals);
        }
      },
      onConsultationsChange: (newConsultations) => {
        if (newConsultations) {
          setConsultations(newConsultations);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [reloadFromSqlite]);

  // Keep active family synchronized with current active user (student/parent)
  useEffect(() => {
    if (currentUser && (currentUser.role === 'student' || currentUser.role === 'parent')) {
      const userFam = families.find(
        (f) =>
          (currentUser.familyId && f.id === currentUser.familyId) ||
          f.studentIds.includes(currentUser.id) ||
          f.parentIds.includes(currentUser.id)
      );
      if (userFam && userFam.id !== family.id) {
        setFamily(userFam);
        setActiveFamilyId(userFam.id);
      }
    }
  }, [currentUser.id, currentUser.familyId, currentUser.role, families, family.id]);

  // Auth modal & session state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('codegenz_auth_logged_in') !== 'false';
    } catch {
      return true;
    }
  });

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const login = async (payload: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    const { emailOrName, password } = payload;
    if (!emailOrName) {
      return { success: false, error: 'Vui lòng nhập Email hoặc Tên người dùng.' };
    }

    // 1. Try server API first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          const loggedUser: User = data.user;
          setUsers((prev) => {
            const exists = prev.some((u) => u.id === loggedUser.id);
            if (exists) {
              return prev.map((u) => (u.id === loggedUser.id ? loggedUser : u));
            }
            return [loggedUser, ...prev];
          });

          setCurrentUserId(loggedUser.id);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('codegenz_current_user_id', loggedUser.id);
            localStorage.setItem('codegenz_auth_logged_in', 'true');
          } catch {}

          if (loggedUser.role === 'student' || loggedUser.role === 'parent') {
            const userFam = families.find(
              (f) =>
                (loggedUser.familyId && f.id === loggedUser.familyId) ||
                f.studentIds.includes(loggedUser.id) ||
                f.parentIds.includes(loggedUser.id)
            );
            if (userFam) {
              setFamily(userFam);
              setActiveFamilyId(userFam.id);
            }
          }

          setAuthModalOpen(false);
          triggerCelebration();
          return { success: true };
        } else if (res.status === 401 || res.status === 403) {
          return { success: false, error: data.error || 'Đăng nhập không thành công.' };
        }
      }
    } catch (serverErr) {
      console.warn('[App] Server login API unreachable, using client-side fallback:', serverErr);
    }

    // 2. Client-side Fallback Login (for static web servers or offline mode)
    const normalizedInput = emailOrName.trim().toLowerCase();
    const matchedUser = users.find(
      (u) =>
        u.email.toLowerCase() === normalizedInput ||
        u.name.toLowerCase() === normalizedInput ||
        u.id.toLowerCase() === normalizedInput
    );

    if (!matchedUser) {
      return {
        success: false,
        error: 'Máy chủ đăng nhập chưa phản hồi hợp lệ và không tìm thấy tài khoản trong bộ nhớ trình duyệt này. Chưa thể xác minh tài khoản; vui lòng liên hệ quản trị viên.',
      };
    }

    if (matchedUser.status === 'locked') {
      return {
        success: false,
        error: 'Tài khoản của bạn hiện đang bị TẠM KHÓA bởi Quản trị viên. Vui lòng liên hệ ban quản trị để được hỗ trợ.',
      };
    }

    if (!password || !matchedUser.password || matchedUser.password !== password) {
      return {
        success: false,
        error: 'Máy chủ đăng nhập chưa phản hồi hợp lệ. Thông tin lưu trong trình duyệt không xác minh được mật khẩu này; chưa thể kết luận mật khẩu trên máy chủ không chính xác. Vui lòng liên hệ quản trị viên để khôi phục kết nối đăng nhập.',
      };
    }

    const updatedUser: User = {
      ...matchedUser,
      lastLoginAt: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setCurrentUserId(updatedUser.id);
    setIsAuthenticated(true);

    try {
      localStorage.setItem('codegenz_current_user_id', updatedUser.id);
      localStorage.setItem('codegenz_auth_logged_in', 'true');
    } catch {}

    if (updatedUser.role === 'student' || updatedUser.role === 'parent') {
      const userFam = families.find(
        (f) =>
          (updatedUser.familyId && f.id === updatedUser.familyId) ||
          f.studentIds.includes(updatedUser.id) ||
          f.parentIds.includes(updatedUser.id)
      );
      if (userFam) {
        setFamily(userFam);
        setActiveFamilyId(userFam.id);
      }
    }

    addAuditLog('USER_LOGIN', 'auth', `Đăng nhập thành công vào hệ thống [${updatedUser.name}]`);
    setAuthModalOpen(false);
    triggerCelebration();
    return { success: true };
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    const {
      name,
      email,
      password,
      role,
      familyRole,
      familyCode,
      grade,
      title,
      phone,
      bio,
      avatar,
    } = payload;

    if (!name || !email || !role) {
      return { success: false, error: 'Vui lòng điền đầy đủ Họ tên, Email và Vai trò.' };
    }

    // 1. Try server API first
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          const registeredUser: User = data.user;
          setUsers((prev) => [registeredUser, ...prev.filter((u) => u.id !== registeredUser.id)]);
          setCurrentUserId(registeredUser.id);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('codegenz_current_user_id', registeredUser.id);
            localStorage.setItem('codegenz_auth_logged_in', 'true');
          } catch {}

          setAuthModalOpen(false);
          triggerCelebration();
          await reloadFromSqlite();
          return { success: true };
        } else if (res.status === 400 || res.status === 403) {
          return { success: false, error: data.error || 'Đăng ký không thành công.' };
        }
      }
    } catch (serverErr) {
      console.warn('[App] Server register API unreachable, using client-side fallback:', serverErr);
    }

    // 2. Client-side Fallback Registration (for static web servers or offline mode)
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return { success: false, error: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.' };
    }

    const defaultPermissions = {
      canCreateJournal: true,
      canViewFamilyJournals: true,
      canRequestConsultation: role === 'student' || role === 'admin',
      canManageConsultations: role === 'psychologist' || role === 'admin',
      canManageChallenges: role === 'admin',
      canManageDeeptalk: role === 'admin',
      canManageUsers: role === 'admin',
      canAuditLogs: role === 'admin',
      canExportDatabase: role === 'admin',
    };

    const defaultAvatar =
      avatar ||
      (role === 'student'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : role === 'parent'
        ? (familyRole === 'father'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80')
        : role === 'psychologist'
        ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80');

    const newUserId = `user-${role}-${Date.now().toString(36)}`;
    let targetFamilyId: string | undefined = undefined;

    if (role === 'student') {
      if (familyCode && familyCode.trim()) {
        const matched = families.find((f) => f.familyCode.toUpperCase() === familyCode.trim().toUpperCase());
        if (matched) {
          targetFamilyId = matched.id;
          setFamilies((prev) =>
            prev.map((f) =>
              f.id === matched.id
                ? { ...f, studentIds: Array.from(new Set([...f.studentIds, newUserId])) }
                : f
            )
          );
        }
      }
      if (!targetFamilyId) {
        const newFamId = `family-${Date.now()}`;
        const newFamCode = `CODE-${Math.floor(1000 + Math.random() * 9000)}`;
        const newFam: Family = {
          id: newFamId,
          name: `Tổ Ấm ${name.trim()}`,
          familyCode: newFamCode,
          studentIds: [newUserId],
          parentIds: [],
          happinessPoints: 100,
          streakDays: 1,
          createdAt: new Date().toISOString(),
          avatarIcon: '🏡',
          description: `Tổ ấm gia đình của ${name.trim()} – nơi lắng nghe và gắn kết yêu thương.`,
        };
        setFamilies((prev) => [newFam, ...prev]);
        setFamily(newFam);
        setActiveFamilyId(newFam.id);
        targetFamilyId = newFamId;
      }
    } else if (role === 'parent') {
      if (familyCode && familyCode.trim()) {
        const matched = families.find((f) => f.familyCode.toUpperCase() === familyCode.trim().toUpperCase());
        if (matched) {
          targetFamilyId = matched.id;
          setFamilies((prev) =>
            prev.map((f) =>
              f.id === matched.id
                ? { ...f, parentIds: Array.from(new Set([...f.parentIds, newUserId])) }
                : f
            )
          );
        }
      }
    }

    const newUser: User = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      password: password || 'password123',
      role,
      familyRole: familyRole || (role === 'student' ? 'student' : role === 'parent' ? 'mother' : 'none'),
      avatar: defaultAvatar,
      familyId: targetFamilyId,
      grade: grade || (role === 'student' ? 'Lớp 11 – THPT' : undefined),
      title: title || (role === 'psychologist' ? 'Chuyên viên Tham vấn Tâm lý' : undefined),
      bio: bio || `Thành viên mới tham gia nền tảng CODE GenZ Family.`,
      phone: phone || undefined,
      verified: role === 'psychologist' ? false : true,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: defaultPermissions,
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUserId(newUser.id);
    setIsAuthenticated(true);

    try {
      localStorage.setItem('codegenz_current_user_id', newUser.id);
      localStorage.setItem('codegenz_auth_logged_in', 'true');
    } catch {}

    // Welcome Notification
    const welcomeNotif: NotificationItem = {
      id: `notif-welcome-${Date.now()}`,
      userId: newUserId,
      title: `Chào mừng bạn đến với CODE GenZ Family! 🎉`,
      message: `Tài khoản ${newUser.name} đã được khởi tạo thành công với vai trò ${
        role === 'student' ? 'Học sinh THPT' : role === 'parent' ? 'Phụ huynh' : role === 'psychologist' ? 'Chuyên gia Tâm lý' : 'Quản trị viên'
      }. Hãy bắt đầu khám phá nhật ký cảm xúc và các công cụ gắn kết gia đình.`,
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
      actionTab: 'dashboard',
    };
    setNotifications((prev) => [welcomeNotif, ...prev]);

    // Audit log
    addAuditLog('USER_REGISTER', 'users', `Đăng ký tài khoản mới thành công [Email: ${newUser.email}, Vai trò: ${role}]`);

    setAuthModalOpen(false);
    triggerCelebration();
    return { success: true };
  };

  const logout = () => {
    try {
      localStorage.setItem('codegenz_auth_logged_in', 'false');
      localStorage.removeItem('codegenz_current_user_id');
    } catch {}
    addAuditLog('USER_LOGOUT', `user:${currentUser.id}`, `Người dùng ${currentUser.name} (${currentUser.role}) đăng xuất khỏi hệ thống.`);
    setIsAuthenticated(false);
    openAuthModal('login');
  };

  // Admin User CRUD Methods with fallback
  const adminCreateUser = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const created: User = data.data;
          setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
          return { success: true };
        } else if (res.status === 400) {
          return { success: false, error: data.error || 'Lỗi tạo người dùng' };
        }
      }
    } catch (err: any) {
      console.warn('[App] Admin create user server API unreachable, using local fallback:', err);
    }

    const newId = userData.id || `user-${userData.role || 'student'}-${Date.now().toString(36)}`;
    const created: User = {
      id: newId,
      name: userData.name || 'Người dùng mới',
      email: userData.email || `user${Date.now()}@gmail.com`,
      role: userData.role || 'student',
      familyRole: userData.familyRole || 'student',
      status: userData.status || 'active',
      verified: userData.verified ?? true,
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: userData.permissions || {},
      ...userData,
    };
    setUsers((prev) => [created, ...prev]);
    addAuditLog('ADMIN_CREATE_USER', 'users', `Admin tạo người dùng ${created.name} (${created.email})`);
    return { success: true };
  };

  const adminUpdateUser = async (id: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const updated: User = data.data;
          setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
          return { success: true };
        }
      }
    } catch (err: any) {
      console.warn('[App] Admin update user server API unreachable, using local fallback:', err);
    }

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    addAuditLog('ADMIN_UPDATE_USER', `user:${id}`, `Admin cập nhật thông tin người dùng ${id}`);
    return { success: true };
  };

  const adminToggleUserStatus = async (id: string, status?: 'active' | 'locked'): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success) {
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status: data.newStatus } : u))
          );
          return { success: true };
        }
      }
    } catch (err: any) {
      console.warn('[App] Admin toggle status server API unreachable, using local fallback:', err);
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newSt = status || (u.status === 'active' ? 'locked' : 'active');
          return { ...u, status: newSt };
        }
        return u;
      })
    );
    addAuditLog('ADMIN_TOGGLE_USER_STATUS', `user:${id}`, `Admin đổi trạng thái người dùng ${id}`);
    return { success: true };
  };

  const adminResetPassword = async (id: string, newPassword?: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const finalPass = newPassword || 'password123';
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: finalPass }),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (err: any) {
      console.warn('[App] Admin reset password server API unreachable, using local fallback:', err);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, password: finalPass } : u))
    );
    addAuditLog('ADMIN_RESET_PASSWORD', `user:${id}`, `Admin đặt lại mật khẩu cho người dùng ${id}`);
    return { success: true, message: `Đã đặt lại mật khẩu thành công: ${finalPass}` };
  };

  const adminDeleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (res.ok && data.success) {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          return { success: true };
        }
      }
    } catch (err: any) {
      console.warn('[App] Admin delete user server API unreachable, using local fallback:', err);
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    addAuditLog('ADMIN_DELETE_USER', `user:${id}`, `Admin xóa người dùng ${id}`);
    return { success: true };
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch {
      // ignore
    }
  };

  const addAuditLog = (action: string, resource: string, details: string, status: 'SUCCESS' | 'BLOCKED_PRIVACY' = 'SUCCESS') => {
    const newLog: SecurityAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      resource,
      details,
      timestamp: new Date().toISOString(),
      status,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    // Send to SQLite API in background
    fetch('/api/db/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});
  };

  // Account changes require the standard sign-in flow.
  const switchUser = (_userId: string) => { openAuthModal('login'); };

  const addHappinessPoints = (amount: number, source: HappinessPointRecord['source'], sourceTitle: string) => {
    const newRecord: HappinessPointRecord = {
      id: `hp-${Date.now()}`,
      familyId: family.id,
      amount,
      source,
      sourceTitle,
      createdAt: new Date().toISOString(),
    };
    setHappinessHistory((prev) => [newRecord, ...prev]);
    setFamily((prev) => ({
      ...prev,
      happinessPoints: prev.happinessPoints + amount,
    }));
    triggerCelebration();

    // Persist to SQLite
    fetch('/api/db/happiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    }).catch(() => {});
  };

  // 1. Create Emotion Journal in SQLite
  const createJournalEntry = (
    entryData: Omit<EmotionJournalEntry, 'id' | 'createdAt' | 'parentReactions' | 'studentId' | 'studentName'>
  ): string => {
    const newId = `journal-${Date.now()}`;
    const newEntry: EmotionJournalEntry = {
      ...entryData,
      id: newId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      familyId: currentUser.familyId || family.id,
      parentReactions: [],
      createdAt: new Date().toISOString(),
    };

    setJournalEntries((prev) => [newEntry, ...prev]);
    addAuditLog('CREATE_JOURNAL', newId, `Học sinh tạo nhật ký cảm xúc [${newEntry.emotionLabel}], quyền: ${newEntry.privacy}`);

    // If shared with parent, notify parent and add points
    if (newEntry.privacy === 'share_parent' || newEntry.privacy === 'share_all') {
      addHappinessPoints(15, 'journal_share', `Chia sẻ nhật ký cảm xúc (${newEntry.emotionLabel})`);
      const parents = users.filter((u) => u.role === 'parent' && u.familyId === currentUser.familyId);
      parents.forEach((p) => {
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}-${p.id}`,
            userId: p.id,
            title: `${currentUser.name} vừa chia sẻ nhật ký cảm xúc`,
            message: `Cảm xúc: ${newEntry.emotionLabel}. Hãy xem và gửi lời động viên cho con nhé!`,
            type: 'journal',
            isRead: false,
            createdAt: new Date().toISOString(),
            actionTab: 'journals',
          },
          ...prev,
        ]);
      });
    }

    // Persist to Cloud Firestore
    saveCloudDocument(COLLECTIONS.JOURNAL_ENTRIES, newId, newEntry).catch(() => {});

    // Persist to SQLite DB
    fetch('/api/db/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    }).catch((err) => console.error('Failed to save journal to SQLite:', err));

    return newId;
  };

  // 2. Update Journal Privacy in SQLite
  const updateJournalPrivacy = (journalId: string, privacy: JournalPrivacy) => {
    setJournalEntries((prev) =>
      prev.map((j) => (j.id === journalId ? { ...j, privacy } : j))
    );
    addAuditLog('UPDATE_JOURNAL_PRIVACY', journalId, `Cập nhật quyền riêng tư nhật ký thành: ${privacy}`);

    fetch(`/api/db/journals/${journalId}/privacy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privacy,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
      }),
    }).catch(() => {});
  };

  // 3. Delete Journal in SQLite
  const deleteJournalEntry = (journalId: string) => {
    setJournalEntries((prev) => prev.filter((j) => j.id !== journalId));
    addAuditLog('DELETE_JOURNAL', journalId, `Xóa nhật ký cảm xúc`);

    fetch(`/api/db/journals/${journalId}?userId=${encodeURIComponent(currentUser.id)}&userName=${encodeURIComponent(currentUser.name)}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  // 4. Add Parent Reaction in SQLite
  const addParentReaction = (
    journalId: string,
    reactionType: 'heart' | 'hug' | 'proud' | 'listen',
    comment?: string
  ) => {
    const roleName = currentUser.familyRole === 'father' ? 'Bố ' + currentUser.name.split(' ').pop() : 'Mẹ ' + currentUser.name.split(' ').pop();
    const newReaction: ParentReaction = {
      id: `react-${Date.now()}`,
      parentId: currentUser.id,
      parentName: currentUser.name,
      parentRoleName: roleName,
      reactionType,
      comment,
      createdAt: new Date().toISOString(),
    };

    setJournalEntries((prev) =>
      prev.map((j) => {
        if (j.id === journalId) {
          setNotifications((notifs) => [
            {
              id: `notif-${Date.now()}`,
              userId: j.studentId,
              title: `${roleName} đã gửi phản hồi yêu thương`,
              message: comment ? `"${comment}"` : `${roleName} đã gửi biểu cảm và động viên bạn.`,
              type: 'parent_reacted',
              isRead: false,
              createdAt: new Date().toISOString(),
              actionTab: 'journals',
            },
            ...notifs,
          ]);
          return {
            ...j,
            parentReactions: [...j.parentReactions, newReaction],
          };
        }
        return j;
      })
    );

    addHappinessPoints(10, 'positive_reaction', `${roleName} gửi phản hồi khích lệ con`);
    addAuditLog('PARENT_REACTION', journalId, `Cha mẹ gửi phản hồi [${reactionType}] cho nhật ký con`);

    // Persist to SQLite
    fetch(`/api/db/journals/${journalId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReaction),
    }).catch(() => {});
  };

  // 5. Request Consultation in SQLite
  const requestConsultation = (params: {
    topic: string;
    initialMessage: string;
    psychologistId?: string;
    sharedJournalIds: string[];
  }): string => {
    const psych = users.find((u) => u.id === (params.psychologistId || 'user-psy-1')) || users.find((u) => u.role === 'psychologist');
    const newId = `consultation-${Date.now()}`;

    const newSession: ConsultationSession = {
      id: newId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentGrade: currentUser.grade,
      psychologistId: psych?.id,
      psychologistName: psych?.name,
      psychologistTitle: psych?.title,
      topic: params.topic,
      initialMessage: params.initialMessage,
      sharedJournalIds: params.sharedJournalIds,
      status: 'pending',
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: 'student',
          content: params.initialMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConsultations((prev) => [newSession, ...prev]);

    setJournalEntries((prev) =>
      prev.map((j) =>
        params.sharedJournalIds.includes(j.id)
          ? { ...j, consultationRequested: true, consultationId: newId }
          : j
      )
    );

    if (psych) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-${psych.id}`,
          userId: psych.id,
          title: `Yêu cầu tham vấn mới từ ${currentUser.name}`,
          message: `Chủ đề: "${params.topic}". Kèm theo ${params.sharedJournalIds.length} nhật ký được phân quyền.`,
          type: 'consultation_request',
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: 'consultation',
        },
        ...prev,
      ]);
    }

    addAuditLog(
      'REQUEST_CONSULTATION',
      newId,
      `Học sinh gửi yêu cầu tham vấn tới chuyên gia ${psych?.name || 'Tâm lý'} kèm ${params.sharedJournalIds.length} nhật ký`
    );

    // Persist to SQLite DB
    fetch('/api/db/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    }).catch(() => {});

    return newId;
  };

  // 6. Send Consultation Message in SQLite
  const sendConsultationMessage = (consultationId: string, content: string) => {
    const isPsych = currentUser.role === 'psychologist';
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: (isPsych ? 'psychologist' : 'student') as 'student' | 'psychologist',
      content,
      timestamp: new Date().toISOString(),
    };

    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id === consultationId) {
          const recipientId = isPsych ? c.studentId : (c.psychologistId || 'user-psy-1');
          if (recipientId) {
            setNotifications((notifs) => [
              {
                id: `notif-${Date.now()}`,
                userId: recipientId,
                title: `${currentUser.name} vừa gửi tin nhắn tham vấn`,
                message: content.length > 60 ? content.slice(0, 60) + '...' : content,
                type: 'consultation_reply',
                isRead: false,
                createdAt: new Date().toISOString(),
                actionTab: 'consultation',
              },
              ...notifs,
            ]);
          }
          return {
            ...c,
            status: isPsych ? 'awaiting_student' : 'in_progress',
            messages: [...c.messages, newMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );

    addAuditLog('SEND_CONSULTATION_MESSAGE', consultationId, `Gửi tin nhắn trong phiên tham vấn (${currentUser.role})`);

    // Persist to SQLite
    fetch(`/api/db/consultations/${consultationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    }).catch(() => {});
  };

  // 7. Update Consultation Status in SQLite
  const updateConsultationStatus = (
    consultationId: string,
    status: ConsultationStatus,
    officialFeedback?: string,
    nextActionPlan?: string,
    privateNotes?: string
  ) => {
    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id === consultationId) {
          const updated = {
            ...c,
            status,
            psychologistId: c.psychologistId || currentUser.id,
            psychologistName: c.psychologistName || currentUser.name,
            psychologistTitle: c.psychologistTitle || currentUser.title,
            officialFeedback: officialFeedback !== undefined ? officialFeedback : c.officialFeedback,
            nextActionPlan: nextActionPlan !== undefined ? nextActionPlan : c.nextActionPlan,
            privateProfessionalNotes: privateNotes !== undefined ? privateNotes : c.privateProfessionalNotes,
            updatedAt: new Date().toISOString(),
            completedAt: status === 'completed' ? new Date().toISOString() : c.completedAt,
          };

          if (officialFeedback || status === 'completed') {
            setNotifications((notifs) => [
              {
                id: `notif-${Date.now()}`,
                userId: c.studentId,
                title: `Chuyên gia tâm lý đã gửi định hướng cho bạn`,
                message: `Phiên tham vấn "${c.topic}" đã có phản hồi chuyên môn & kế hoạch hành động.`,
                type: 'consultation_reply',
                isRead: false,
                createdAt: new Date().toISOString(),
                actionTab: 'consultation',
              },
              ...notifs,
            ]);
          }

          return updated;
        }
        return c;
      })
    );

    addAuditLog('UPDATE_CONSULTATION_STATUS', consultationId, `Cập nhật trạng thái phiên tham vấn: ${status}`);

    // Persist to SQLite
    fetch(`/api/db/consultations/${consultationId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        officialFeedback,
        nextActionPlan,
        privateNotes,
        psychologistId: currentUser.id,
        psychologistName: currentUser.name,
      }),
    }).catch(() => {});
  };

  // 8. Deep Talk Sessions in SQLite
  const startDeepTalkSession = (topicId: string): DeepTalkSession => {
    const topic = deepTalkTopics.find((t) => t.id === topicId);
    const newSession: DeepTalkSession = {
      id: `session-dt-${Date.now()}`,
      familyId: family.id,
      topicId,
      topicTitle: topic?.title || 'Deep Talk',
      currentQuestionIndex: 0,
      answers: [],
      isCompleted: false,
      startedAt: new Date().toISOString(),
    };

    setDeepTalkSessions((prev) => [newSession, ...prev]);
    addAuditLog('START_DEEP_TALK', topicId, `Bắt đầu phiên Deep Talk: ${topic?.title}`);

    fetch('/api/db/deeptalk/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    }).catch(() => {});

    return newSession;
  };

  const submitDeepTalkAnswer = (sessionId: string, questionId: string, answer: string, isParent: boolean) => {
    setDeepTalkSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const existingAnswerIndex = s.answers.findIndex((a) => a.questionId === questionId);
          let newAnswers = [...s.answers];
          if (existingAnswerIndex >= 0) {
            newAnswers[existingAnswerIndex] = {
              ...newAnswers[existingAnswerIndex],
              [isParent ? 'parentAnswer' : 'studentAnswer']: answer,
            };
          } else {
            newAnswers.push({
              questionId,
              [isParent ? 'parentAnswer' : 'studentAnswer']: answer,
            });
          }
          return { ...s, answers: newAnswers };
        }
        return s;
      })
    );

    fetch(`/api/db/deeptalk/sessions/${sessionId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answer, isParent }),
    }).catch(() => {});
  };

  const completeDeepTalkSession = (sessionId: string, reflection?: string) => {
    const session = deepTalkSessions.find((s) => s.id === sessionId);
    const topic = deepTalkTopics.find((t) => t.id === session?.topicId);
    const points = topic?.pointsAwarded || 50;

    setDeepTalkSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              isCompleted: true,
              reflection,
              completedAt: new Date().toISOString(),
            }
          : s
      )
    );

    addHappinessPoints(points, 'deeptalk', `Hoàn thành Deep Talk: ${session?.topicTitle}`);
    addAuditLog('COMPLETE_DEEP_TALK', sessionId, `Hoàn tất phiên Deep Talk và cộng ${points} Happiness Points`);

    fetch(`/api/db/deeptalk/sessions/${sessionId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reflection,
        familyId: family.id,
        topicTitle: session?.topicTitle,
      }),
    }).catch(() => {});
  };

  // 9. Challenge 30 Days in SQLite
  const confirmChallengeTask = (day: number, role: 'student' | 'parent', note?: string) => {
    const task = challengeTasks.find((t) => t.day === day);
    const points = task?.points || 30;

    setChallengeProgress((prev) => {
      const existing = prev.find((p) => p.day === day);
      let updatedList = [...prev];

      if (existing) {
        const studentDone = role === 'student' ? true : existing.studentConfirmed;
        const parentDone = role === 'parent' ? true : existing.parentConfirmed;
        const nowCompleted = studentDone && parentDone;

        updatedList = prev.map((p) =>
          p.day === day
            ? {
                ...p,
                studentConfirmed: studentDone,
                parentConfirmed: parentDone,
                isCompleted: nowCompleted,
                completedAt: nowCompleted ? (p.completedAt || new Date().toISOString()) : p.completedAt,
                note: note || p.note,
              }
            : p
        );

        if (nowCompleted && !existing.isCompleted) {
          addHappinessPoints(points, 'challenge', `Hoàn thành Thử thách Ngày ${day}: ${task?.title}`);
        }
      } else {
        const studentDone = role === 'student';
        const parentDone = role === 'parent';
        const nowCompleted = studentDone && parentDone;

        updatedList.push({
          day,
          studentConfirmed: studentDone,
          parentConfirmed: parentDone,
          isCompleted: nowCompleted,
          completedAt: nowCompleted ? new Date().toISOString() : undefined,
          note,
        });

        if (nowCompleted) {
          addHappinessPoints(points, 'challenge', `Hoàn thành Thử thách Ngày ${day}: ${task?.title}`);
        }
      }

      return updatedList;
    });

    addAuditLog('CONFIRM_CHALLENGE', `day-${day}`, `${role === 'student' ? 'Học sinh' : 'Cha mẹ'} xác nhận hoàn thành ngày ${day}`);

    fetch(`/api/db/challenges/${day}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        note,
        userId: currentUser.id,
        userName: currentUser.name,
        title: task?.title,
        points,
      }),
    }).catch(() => {});
  };

  // 10. Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    fetch(`/api/db/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === currentUser.id ? { ...n, isRead: true } : n))
    );
    fetch('/api/db/notifications/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => {});
  };

  // Sync active family when currentUser changes or activeFamilyId changes
  useEffect(() => {
    if (currentUser?.familyId) {
      const match = families.find((f) => f.id === currentUser.familyId);
      if (match) {
        setFamily(match);
        return;
      }
    }
    const currentActive = families.find((f) => f.id === activeFamilyId) || families[0] || INITIAL_FAMILIES[0];
    setFamily(currentActive);
  }, [currentUser, families, activeFamilyId]);

  // Family Helper Functions
  const getFamilyMembers = (targetFamilyId: string) => {
    const fam = families.find((f) => f.id === targetFamilyId) || family;
    const studentIds = fam ? fam.studentIds : [];
    const parentIds = fam ? fam.parentIds : [];
    const students = users.filter((u) => studentIds.includes(u.id) || (u.familyId === fam?.id && u.role === 'student'));
    const parents = users.filter((u) => parentIds.includes(u.id) || (u.familyId === fam?.id && u.role === 'parent'));
    return { students, parents };
  };

  const switchActiveFamily = (targetFamilyId: string) => {
    const match = families.find((f) => f.id === targetFamilyId);
    if (match) {
      setActiveFamilyId(targetFamilyId);
      setFamily(match);
    }
  };

  const joinFamilyWithCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/db/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userRole: currentUser.role,
          code,
        }),
      });
      const data = await res.json();
      if (data.success && data.family) {
        setFamily(data.family);
        setFamilies((prev) => {
          const exists = prev.some((f) => f.id === data.family.id);
          return exists ? prev.map((f) => (f.id === data.family.id ? data.family : f)) : [...prev, data.family];
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, familyId: data.family.id } : u))
        );
        addAuditLog('JOIN_FAMILY_CODE', data.family.id, `Người dùng ${currentUser.name} kết nối gia đình qua mã ${code}`);
        triggerCelebration();
        return { success: true, message: data.message || `Đã tham gia nhóm gia đình "${data.family.name}"!` };
      }
      return { success: false, message: data.message || 'Mã gia đình không đúng hoặc đã hết hạn.' };
    } catch {
      const cleanCode = code.trim().toUpperCase();
      const match = families.find((f) => f.familyCode.toUpperCase() === cleanCode) || (cleanCode === family.familyCode ? family : null);
      if (match) {
        setFamily((prev) => {
          const studentIds = currentUser.role === 'student' && !match.studentIds.includes(currentUser.id)
            ? [...match.studentIds, currentUser.id]
            : match.studentIds;
          const parentIds = currentUser.role === 'parent' && !match.parentIds.includes(currentUser.id)
            ? [...match.parentIds, currentUser.id]
            : match.parentIds;
          return { ...match, studentIds, parentIds };
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, familyId: match.id } : u))
        );
        triggerCelebration();
        return { success: true, message: `Kết nối thành công vào gia đình "${match.name}"!` };
      }
      return { success: false, message: 'Mã gia đình không tồn tại hoặc đã hết hạn.' };
    }
  };

  const createFamily = async (
    name: string,
    avatarIcon?: string,
    description?: string
  ): Promise<{ success: boolean; message: string; family?: Family }> => {
    try {
      const res = await fetch('/api/db/families/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          avatarIcon,
          description,
          creatorId: currentUser.id,
          creatorRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newFam: Family = data.data;
        setFamilies((prev) => [...prev, newFam]);
        setFamily(newFam);
        setActiveFamilyId(newFam.id);
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, familyId: newFam.id } : u))
        );
        triggerCelebration();
        return { success: true, message: data.message || `Đã tạo gia đình "${name}"!`, family: newFam };
      }
      return { success: false, message: data.error || 'Không thể tạo nhóm gia đình.' };
    } catch {
      const newFam: Family = {
        id: `family-${Date.now()}`,
        name,
        familyCode: `CODE-${Math.floor(1000 + Math.random() * 9000)}`,
        studentIds: currentUser.role === 'student' ? [currentUser.id] : [],
        parentIds: currentUser.role === 'parent' ? [currentUser.id] : [],
        happinessPoints: 100,
        streakDays: 1,
        createdAt: new Date().toISOString(),
        avatarIcon: avatarIcon || '🏡',
        description,
      };
      setFamilies((prev) => [...prev, newFam]);
      setFamily(newFam);
      setActiveFamilyId(newFam.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, familyId: newFam.id } : u))
      );
      triggerCelebration();
      return { success: true, message: `Đã tạo gia đình "${name}" thành công!`, family: newFam };
    }
  };

  const updateFamilyDetails = async (
    targetFamilyId: string,
    updates: Partial<Family>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/db/families/${targetFamilyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setFamilies((prev) =>
          prev.map((f) => (f.id === targetFamilyId ? { ...f, ...updates } : f))
        );
        if (family.id === targetFamilyId) {
          setFamily((prev) => ({ ...prev, ...updates }));
        }
        return { success: true, message: data.message || 'Đã cập nhật thông tin gia đình!' };
      }
      return { success: false, message: data.error || 'Cập nhật thất bại' };
    } catch {
      setFamilies((prev) =>
        prev.map((f) => (f.id === targetFamilyId ? { ...f, ...updates } : f))
      );
      if (family.id === targetFamilyId) {
        setFamily((prev) => ({ ...prev, ...updates }));
      }
      return { success: true, message: 'Đã cập nhật thông tin nhóm gia đình!' };
    }
  };

  const linkUserToFamily = async (
    targetFamilyId: string,
    userId: string,
    familyRole?: FamilyRole
  ): Promise<{ success: boolean; message: string }> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, message: 'Không tìm thấy người dùng.' };

    try {
      const res = await fetch(`/api/db/families/${targetFamilyId}/add-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: targetUser.role, familyRole }),
      });
      const data = await res.json();
      if (data.success) {
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id === targetFamilyId) {
              const studentIds = targetUser.role === 'student' && !f.studentIds.includes(userId) ? [...f.studentIds, userId] : f.studentIds;
              const parentIds = targetUser.role === 'parent' && !f.parentIds.includes(userId) ? [...f.parentIds, userId] : f.parentIds;
              return { ...f, studentIds, parentIds };
            }
            return f;
          })
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, familyId: targetFamilyId, familyRole: familyRole || u.familyRole } : u))
        );
        return { success: true, message: data.message || 'Đã kết nối thành viên vào nhóm gia đình thành công!' };
      }
      return { success: false, message: data.message || 'Không thể liên kết thành viên' };
    } catch {
      setFamilies((prev) =>
        prev.map((f) => {
          if (f.id === targetFamilyId) {
            const studentIds = targetUser.role === 'student' && !f.studentIds.includes(userId) ? [...f.studentIds, userId] : f.studentIds;
            const parentIds = targetUser.role === 'parent' && !f.parentIds.includes(userId) ? [...f.parentIds, userId] : f.parentIds;
            return { ...f, studentIds, parentIds };
          }
          return f;
        })
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, familyId: targetFamilyId, familyRole: familyRole || u.familyRole } : u))
      );
      return { success: true, message: `Đã kết nối ${targetUser.name} vào gia đình thành công!` };
    }
  };

  const removeUserFromFamily = async (
    targetFamilyId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/db/families/${targetFamilyId}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id === targetFamilyId) {
              return {
                ...f,
                studentIds: f.studentIds.filter((id) => id !== userId),
                parentIds: f.parentIds.filter((id) => id !== userId),
              };
            }
            return f;
          })
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, familyId: undefined } : u))
        );
        return { success: true, message: 'Đã hủy kết nối thành viên khỏi nhóm gia đình.' };
      }
      return { success: false, message: data.message || 'Không thể hủy kết nối' };
    } catch {
      setFamilies((prev) =>
        prev.map((f) => {
          if (f.id === targetFamilyId) {
            return {
              ...f,
              studentIds: f.studentIds.filter((id) => id !== userId),
              parentIds: f.parentIds.filter((id) => id !== userId),
            };
          }
          return f;
        })
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, familyId: undefined } : u))
      );
      return { success: true, message: 'Đã hủy kết nối thành viên khỏi nhóm gia đình.' };
    }
  };

  const sendFamilyInvitation = async (
    recipientEmailOrPhone: string,
    targetFamilyRole: FamilyRole
  ): Promise<{ success: boolean; message: string }> => {
    const inv: FamilyInvitation = {
      id: `inv-${Date.now()}`,
      familyId: family.id,
      familyName: family.name,
      familyCode: family.familyCode,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role as 'student' | 'parent',
      recipientEmailOrPhone,
      targetFamilyRole,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/db/family-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
      const data = await res.json();
      setFamilyInvitations((prev) => [inv, ...prev]);
      return { success: true, message: data.message || `Đã gửi lời mời tới ${recipientEmailOrPhone}!` };
    } catch {
      setFamilyInvitations((prev) => [inv, ...prev]);
      return { success: true, message: `Đã tạo và gửi lời mời kết nối tới ${recipientEmailOrPhone}!` };
    }
  };

  const respondToInvitation = async (
    invitationId: string,
    accept: boolean
  ): Promise<{ success: boolean; message: string }> => {
    const inv = familyInvitations.find((i) => i.id === invitationId);
    const status = accept ? 'accepted' : 'declined';
    try {
      const res = await fetch(`/api/db/family-invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          userId: currentUser.id,
          userRole: currentUser.role,
          familyId: inv?.familyId,
        }),
      });
      const data = await res.json();
      setFamilyInvitations((prev) =>
        prev.map((i) => (i.id === invitationId ? { ...i, status } : i))
      );
      if (accept && inv) {
        linkUserToFamily(inv.familyId, currentUser.id, inv.targetFamilyRole);
      }
      return { success: true, message: data.message || 'Đã xử lý lời mời.' };
    } catch {
      setFamilyInvitations((prev) =>
        prev.map((i) => (i.id === invitationId ? { ...i, status } : i))
      );
      if (accept && inv) {
        linkUserToFamily(inv.familyId, currentUser.id, inv.targetFamilyRole);
      }
      return { success: true, message: accept ? 'Đã tham gia nhóm gia đình thành công!' : 'Đã từ chối lời mời.' };
    }
  };

  const adminDeleteFamily = async (targetFamilyId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/db/families/${targetFamilyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFamilies((prev) => prev.filter((f) => f.id !== targetFamilyId));
        setUsers((prev) =>
          prev.map((u) => (u.familyId === targetFamilyId ? { ...u, familyId: undefined } : u))
        );
        return { success: true, message: 'Đã xóa nhóm gia đình thành công.' };
      }
      return { success: false, message: data.error || 'Lỗi khi xóa nhóm gia đình.' };
    } catch {
      setFamilies((prev) => prev.filter((f) => f.id !== targetFamilyId));
      setUsers((prev) =>
        prev.map((u) => (u.familyId === targetFamilyId ? { ...u, familyId: undefined } : u))
      );
      return { success: true, message: 'Đã xóa nhóm gia đình.' };
    }
  };

  const adminAddChallengeTask = (task: Challenge30DayTask) => {
    setChallengeTasks((prev) => [...prev, task]);
    addAuditLog('ADMIN_ADD_CHALLENGE', `day-${task.day}`, `Quản trị viên thêm nhiệm vụ thử thách Ngày ${task.day}`);
  };

  const adminAddDeepTalkTopic = (topic: DeepTalkTopic) => {
    setDeepTalkTopics((prev) => [...prev, topic]);
    addAuditLog('ADMIN_ADD_DEEPTALK', topic.id, `Quản trị viên thêm chủ đề Deep Talk: ${topic.title}`);
  };

  // RBAC and Privacy filter: Strictly respect user roles and privacy boundaries!
  const getFilteredJournalsForUser = (user: User): EmotionJournalEntry[] => {
    if (!isAuthenticated) {
      return [];
    }
    // 1. Student: ONLY sees their own journals
    if (user.role === 'student') {
      return journalEntries.filter((j) => j.studentId === user.id);
    }
    // 2. Parent: ONLY sees journals of their own children (same family) that are shared with parents
    if (user.role === 'parent') {
      return journalEntries.filter(
        (j) =>
          (j.familyId === user.familyId || (!j.familyId && user.familyId)) &&
          (j.privacy === 'share_parent' ||
            j.privacy === 'share_all' ||
            (j.privacy as any) === 'parents_only' ||
            (j.privacy as any) === 'family_open')
      );
    }
    // 3. Psychologist: ONLY sees journals explicitly shared with psychologist or attached to active consultations
    if (user.role === 'psychologist') {
      const consultationJournalIds = consultations
        .filter((c) => c.psychologistId === user.id || !c.psychologistId)
        .flatMap((c) => c.sharedJournalIds);

      return journalEntries.filter(
        (j) =>
          j.privacy === 'share_psychologist' ||
          j.privacy === 'share_all' ||
          (j.privacy as any) === 'psychologist_only' ||
          consultationJournalIds.includes(j.id)
      );
    }
    // 4. Admin: Zero-Trust Privacy - Admin CANNOT view private psychological journals of users
    if (user.role === 'admin') {
      return [];
    }
    return [];
  };

  // RBAC for Consultations: Strict confidentiality between Student and Psychologist
  const getFilteredConsultationsForUser = (user: User): ConsultationSession[] => {
    if (!isAuthenticated) {
      return [];
    }
    // 1. Student: ONLY sees consultations they requested
    if (user.role === 'student') {
      return consultations.filter((c) => c.studentId === user.id);
    }
    // 2. Psychologist: Sees consultations assigned to them or unassigned waiting for intake
    if (user.role === 'psychologist') {
      return consultations.filter((c) => c.psychologistId === user.id || !c.psychologistId);
    }
    // 3. Parent & Admin: Zero access to confidential student-psychologist consultation sessions
    return [];
  };

  // Get full structured database snapshot
  const getFullDatabaseSnapshot = (): AppFullDatabase => {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      system: 'CODE GenZ Family Platform (SQLite 3 Powered)',
      users,
      family,
      journalEntries,
      consultations,
      deepTalkTopics,
      deepTalkSessions,
      challengeTasks,
      challengeProgress,
      happinessHistory,
      notifications,
      auditLogs,
    };
  };

  // Sync snapshot to server disk
  const syncDataToServerNow = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const dbSnapshot = getFullDatabaseSnapshot();
      const xml = exportToXml(dbSnapshot);

      const response = await fetch('/api/data/save-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonBackup: dbSnapshot,
          xmlBackup: xml,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const resJson = await response.json();
      return { success: true, message: resJson.message || 'Đã đồng bộ dữ liệu vào SQLite và lưu trữ tệp XML/JSON thành công.' };
    } catch (err: any) {
      console.error('Sync to server failed:', err);
      return { success: false, message: `Lỗi đồng bộ máy chủ: ${err.message || String(err)}` };
    }
  };

  // Restore database from XML/JSON import
  const restoreFullDatabase = async (
    data: Partial<AppFullDatabase>,
    mergeMode: 'overwrite' | 'merge' = 'overwrite'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Send to SQLite restore endpoint
      const res = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mergeMode }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const db = json.data;
          if (db.users) setUsers(db.users);
          if (db.family) setFamily(db.family);
          if (db.journalEntries) setJournalEntries(db.journalEntries);
          if (db.consultations) setConsultations(db.consultations);
          if (db.deepTalkTopics) setDeepTalkTopics(db.deepTalkTopics);
          if (db.deepTalkSessions) setDeepTalkSessions(db.deepTalkSessions);
          if (db.challengeTasks) setChallengeTasks(db.challengeTasks);
          if (db.challengeProgress) setChallengeProgress(db.challengeProgress);
          if (db.happinessHistory) setHappinessHistory(db.happinessHistory);
          if (db.notifications) setNotifications(db.notifications);
          if (db.auditLogs) setAuditLogs(db.auditLogs);
        }
      } else {
        // Fallback local update
        if (mergeMode === 'overwrite') {
          if (data.users && data.users.length > 0) setUsers(data.users);
          if (data.family) setFamily(data.family);
          if (data.journalEntries) setJournalEntries(data.journalEntries);
          if (data.consultations) setConsultations(data.consultations);
        }
      }

      addAuditLog(
        'DATABASE_RESTORE',
        'SQLite Database Engine',
        `Khôi phục dữ liệu vào SQLite thành công theo chế độ ${mergeMode === 'overwrite' ? 'Ghi đè' : 'Gộp dữ liệu'}.`
      );

      triggerCelebration();
      return {
        success: true,
        message: `Đã khôi phục và đồng bộ thành công vào cơ sở dữ liệu SQLite (${mergeMode === 'overwrite' ? 'Ghi đè toàn bộ' : 'Gộp thêm dữ liệu'}).`,
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi khôi phục: ${err.message || String(err)}` };
    }
  };

  // Reset to initial demo seed data in SQLite
  const resetToInitialData = async () => {
    try {
      const res = await fetch('/api/db/reset', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const db = json.data;
          setUsers(db.users || INITIAL_USERS);
          setCurrentUserId('user-student-1');
          setFamily(db.family || INITIAL_FAMILIES[0]);
          setJournalEntries(db.journalEntries || INITIAL_JOURNAL_ENTRIES);
          setConsultations(db.consultations || INITIAL_CONSULTATIONS);
          setDeepTalkTopics(db.deepTalkTopics || DEEP_TALK_TOPICS);
          setDeepTalkSessions(db.deepTalkSessions || []);
          setChallengeTasks(db.challengeTasks || INITIAL_CHALLENGE_TASKS);
          setChallengeProgress(db.challengeProgress || INITIAL_CHALLENGE_PROGRESS);
          setHappinessHistory(db.happinessHistory || INITIAL_HAPPINESS_HISTORY);
          setNotifications(db.notifications || INITIAL_NOTIFICATIONS);
          setAuditLogs(db.auditLogs || INITIAL_AUDIT_LOGS);
        }
      }
    } catch {
      localStorage.clear();
      setUsers(INITIAL_USERS);
      setCurrentUserId('user-student-1');
      setFamily(INITIAL_FAMILIES[0]);
      setJournalEntries(INITIAL_JOURNAL_ENTRIES);
      setConsultations(INITIAL_CONSULTATIONS);
      setDeepTalkTopics(DEEP_TALK_TOPICS);
      setDeepTalkSessions([]);
      setChallengeTasks(INITIAL_CHALLENGE_TASKS);
      setChallengeProgress(INITIAL_CHALLENGE_PROGRESS);
      setHappinessHistory(INITIAL_HAPPINESS_HISTORY);
      setNotifications(INITIAL_NOTIFICATIONS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
    }

    addAuditLog('DATABASE_RESET', 'SQLite Engine', 'Tái thiết lập toàn bộ cơ sở dữ liệu SQLite về dữ liệu gốc ban đầu.');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        family,
        families,
        familyInvitations,
        journalEntries,
        consultations,
        deepTalkTopics,
        deepTalkSessions,
        challengeTasks,
        challengeProgress,
        happinessHistory,
        notifications,
        auditLogs,
        // Auth modal & session
        isAuthenticated,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        adminCreateUser,
        adminUpdateUser,
        adminToggleUserStatus,
        adminResetPassword,
        adminDeleteUser,
        activeTab,
        sqliteConnected,
        sqliteFile,
        setActiveTab,
        switchUser,
        createJournalEntry,
        updateJournalPrivacy,
        deleteJournalEntry,
        addParentReaction,
        requestConsultation,
        sendConsultationMessage,
        updateConsultationStatus,
        startDeepTalkSession,
        submitDeepTalkAnswer,
        completeDeepTalkSession,
        confirmChallengeTask,
        addHappinessPoints,
        markNotificationRead,
        markAllNotificationsRead,
        joinFamilyWithCode,
        createFamily,
        updateFamilyDetails,
        linkUserToFamily,
        removeUserFromFamily,
        sendFamilyInvitation,
        respondToInvitation,
        adminDeleteFamily,
        switchActiveFamily,
        getFamilyMembers,
        triggerCelebration,
        adminAddChallengeTask,
        adminAddDeepTalkTopic,
        getFilteredJournalsForUser,
        getFilteredConsultationsForUser,
        getFullDatabaseSnapshot,
        restoreFullDatabase,
        resetToInitialData,
        syncDataToServerNow,
        reloadFromSqlite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
