import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import confetti from "canvas-confetti";
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
} from "../types";
import { AppFullDatabase } from "../services/dataStorageService";
import {
  fetchFullCloudDatabase,
  subscribeToCloudChanges,
  saveCloudDocument,
} from "../services/cloudDatabaseService";
import { supabase, accountAction } from "../services/supabaseClient";
import { authErrorMessage } from "../services/supabaseConfig";
import {
  dataRequest,
  flushDataRequests,
} from "../services/supabaseDataService";
import { EMPTY_FAMILY } from "../services/cloudDatabaseService";

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
  authReady: boolean;
  authError: string;
  syncError: string;
  mustChangePassword: boolean;
  changeOwnPassword: (
    password: string,
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  authModalOpen: boolean;
  authModalTab: "login" | "register";
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  login: (
    payload: LoginPayload,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    payload: RegisterPayload,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Admin User & RBAC Management
  adminCreateUser: (
    userData: Partial<User>,
  ) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (
    id: string,
    updates: Partial<User>,
  ) => Promise<{ success: boolean; error?: string }>;
  adminToggleUserStatus: (
    id: string,
    status?: "active" | "locked",
  ) => Promise<{ success: boolean; error?: string }>;
  adminResetPassword: (
    id: string,
    newPassword?: string,
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  adminDeleteUser: (
    id: string,
  ) => Promise<{ success: boolean; error?: string }>;
  createJournalEntry: (
    entry: Omit<
      EmotionJournalEntry,
      "id" | "createdAt" | "parentReactions" | "studentId" | "studentName"
    >,
  ) => string;
  updateJournalPrivacy: (journalId: string, privacy: JournalPrivacy) => void;
  deleteJournalEntry: (journalId: string) => void;
  addParentReaction: (
    journalId: string,
    reactionType: "heart" | "hug" | "proud" | "listen",
    comment?: string,
  ) => void;
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
    privateNotes?: string,
  ) => void;
  startDeepTalkSession: (topicId: string) => DeepTalkSession;
  submitDeepTalkAnswer: (
    sessionId: string,
    questionId: string,
    answer: string,
    isParent: boolean,
  ) => void;
  completeDeepTalkSession: (sessionId: string, reflection?: string) => void;
  confirmChallengeTask: (
    day: number,
    role: "student" | "parent",
    note?: string,
  ) => void;
  addHappinessPoints: (
    amount: number,
    source: HappinessPointRecord["source"],
    sourceTitle: string,
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  joinFamilyWithCode: (
    code: string,
  ) => Promise<{ success: boolean; message: string }>;
  createFamily: (
    name: string,
    avatarIcon?: string,
    description?: string,
  ) => Promise<{ success: boolean; message: string; family?: Family }>;
  updateFamilyDetails: (
    familyId: string,
    updates: Partial<Family>,
  ) => Promise<{ success: boolean; message: string }>;
  linkUserToFamily: (
    familyId: string,
    userId: string,
    familyRole?: FamilyRole,
  ) => Promise<{ success: boolean; message: string }>;
  removeUserFromFamily: (
    familyId: string,
    userId: string,
  ) => Promise<{ success: boolean; message: string }>;
  sendFamilyInvitation: (
    recipientEmailOrPhone: string,
    targetFamilyRole: FamilyRole,
  ) => Promise<{ success: boolean; message: string }>;
  respondToInvitation: (
    invitationId: string,
    accept: boolean,
  ) => Promise<{ success: boolean; message: string }>;
  adminDeleteFamily: (
    familyId: string,
  ) => Promise<{ success: boolean; message: string }>;
  switchActiveFamily: (familyId: string) => void;
  getFamilyMembers: (familyId: string) => { students: User[]; parents: User[] };
  triggerCelebration: () => void;
  adminAddChallengeTask: (task: Challenge30DayTask) => void;
  adminAddDeepTalkTopic: (topic: DeepTalkTopic) => void;
  getFilteredJournalsForUser: (user: User) => EmotionJournalEntry[];
  getFilteredConsultationsForUser: (user: User) => ConsultationSession[];
  getFullDatabaseSnapshot: () => AppFullDatabase;
  restoreFullDatabase: (
    data: Partial<AppFullDatabase>,
    mergeMode?: "overwrite" | "merge",
  ) => Promise<{ success: boolean; message: string }>;
  resetToInitialData: () => Promise<void>;
  syncDataToServerNow: () => Promise<{ success: boolean; message: string }>;
  reloadFromSqlite: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Supabase & Database connection status
  const [sqliteConnected, setSqliteConnected] = useState<boolean>(false);
  const sqliteFile = "Supabase PostgreSQL";

  // Sensitive application records are loaded from Supabase under RLS, never from legacy browser caches.
  const [users, setUsers] = useState<User[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyInvitations, setFamilyInvitations] = useState<
    FamilyInvitation[]
  >([]);
  const [journalEntries, setJournalEntries] = useState<EmotionJournalEntry[]>(
    [],
  );
  const [consultations, setConsultations] = useState<ConsultationSession[]>([]);
  const [deepTalkTopics, setDeepTalkTopics] = useState<DeepTalkTopic[]>([]);
  const [deepTalkSessions, setDeepTalkSessions] = useState<DeepTalkSession[]>(
    [],
  );
  const [challengeTasks, setChallengeTasks] = useState<Challenge30DayTask[]>(
    [],
  );
  const [challengeProgress, setChallengeProgress] = useState<
    ChallengeDayProgress[]
  >([]);
  const [happinessHistory, setHappinessHistory] = useState<
    HappinessPointRecord[]
  >([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [activeFamilyId, setActiveFamilyId] = useState("");
  const [family, setFamily] = useState<Family>(EMPTY_FAMILY);
  const [activeTab, setActiveTab] = useState("dashboard");
  const currentUser =
    users.find((u) => u.id === currentUserId) ||
    ({
      id: "",
      name: "Khách",
      email: "",
      role: "student",
      avatar: "",
      status: "pending",
    } as User);

  const loadGeneration = useRef(0);
  const authGeneration = useRef(0);
  const applyCloudState = (db: any) => {
    setUsers(db.users || []);
    setFamilies(db.families || []);
    setFamilyInvitations(db.familyInvitations || []);
    setJournalEntries(db.journalEntries || []);
    setConsultations(db.consultations || []);
    setDeepTalkTopics(db.deepTalkTopics || []);
    setDeepTalkSessions(db.deepTalkSessions || []);
    setChallengeTasks(db.challengeTasks || []);
    setChallengeProgress(db.challengeProgress || []);
    setHappinessHistory(db.happinessHistory || []);
    setNotifications(db.notifications || []);
    setAuditLogs(db.auditLogs || []);
    setFamily(db.family || EMPTY_FAMILY);
  };
  const reloadFromSqlite = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const generation = loadGeneration.current;
      const cloud = await fetchFullCloudDatabase();
      if (generation !== loadGeneration.current) return;
      applyCloudState(cloud);
      setSqliteConnected(true);
    } catch (error) {
      setSqliteConnected(false);
      throw error;
    }
  }, []);

  // Keep active family synchronized with current active user (student/parent)
  useEffect(() => {
    if (
      currentUser &&
      (currentUser.role === "student" || currentUser.role === "parent")
    ) {
      const userFam = families.find(
        (f) =>
          (currentUser.familyId && f.id === currentUser.familyId) ||
          f.studentIds.includes(currentUser.id) ||
          f.parentIds.includes(currentUser.id),
      );
      if (userFam && userFam.id !== family.id) {
        setFamily(userFam);
        setActiveFamilyId(userFam.id);
      }
    }
  }, [
    currentUser.id,
    currentUser.familyId,
    currentUser.role,
    families,
    family.id,
  ]);

  // Auth modal & session state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">(
    "login",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    const listener = (e: Event) => setSyncError((e as CustomEvent).detail);
    window.addEventListener("codegenz-sync-error", listener);
    return () => window.removeEventListener("codegenz-sync-error", listener);
  }, []);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const clearSessionState = () => {
    loadGeneration.current++;
    authGeneration.current++;
    setSyncError("");
    setIsAuthenticated(false);
    setCurrentUserId("");
    setMustChangePassword(false);
    applyCloudState({});
    setSqliteConnected(false);
  };
  useEffect(() => {
    let alive = true;
    const refreshSession = async () => {
      const request = ++authGeneration.current;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (alive && request === authGeneration.current) clearSessionState();
          return;
        }
        const { user } = await accountAction("me");
        if (!alive || request !== authGeneration.current) return;
        if (user.status !== "active")
          throw new Error("Tài khoản đang bị khóa hoặc chờ duyệt.");
        setUsers((prev) => [user, ...prev.filter((p) => p.id !== user.id)]);
        setCurrentUserId(user.id);
        setIsAuthenticated(true);
        setMustChangePassword(!!user.mustChangePassword);
        if (!user.mustChangePassword) await reloadFromSqlite();
      } catch (error) {
        if (alive && request === authGeneration.current) {
          clearSessionState();
          setAuthError(
            error instanceof Error
              ? error.message
              : "Không thể xác minh phiên đăng nhập.",
          );
          await supabase.auth.signOut({ scope: "local" });
        }
      } finally {
        if (alive) setAuthReady(true);
      }
    };
    void refreshSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (alive) void refreshSession();
      }, 0);
    });
    const timer = setInterval(refreshSession, 30000);
    const unsubscribe = subscribeToCloudChanges({
      onUsersChange: setUsers,
      onFamiliesChange: setFamilies,
      onJournalsChange: setJournalEntries,
      onConsultationsChange: setConsultations,
    });
    return () => {
      alive = false;
      authGeneration.current++;
      listener.subscription.unsubscribe();
      clearInterval(timer);
      unsubscribe();
    };
  }, [reloadFromSqlite]);

  const openAuthModal = (tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const login = async (
    payload: LoginPayload,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!payload.emailOrName.includes("@") || !payload.password)
        throw new Error("Vui lòng nhập email và mật khẩu.");
      const { error } = await supabase.auth.signInWithPassword({
        email: payload.emailOrName.trim().toLowerCase(),
        password: payload.password,
      });
      if (error) throw new Error(authErrorMessage(error));
      const { user } = await accountAction("me");
      if (user.status !== "active") {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("Tài khoản đang bị khóa hoặc chờ quản trị viên duyệt.");
      }
      setUsers((prev) => [user, ...prev.filter((p) => p.id !== user.id)]);
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      setMustChangePassword(!!user.mustChangePassword);
      setAuthError("");
      setAuthModalOpen(false);
      setActiveTab(user.role === "admin" ? "admin" : "dashboard");
      if (!user.mustChangePassword) await reloadFromSqlite();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Không thể đăng nhập.",
      };
    }
  };
  const register = async (
    payload: RegisterPayload,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (
        !payload.name.trim() ||
        !payload.email.includes("@") ||
        !payload.password ||
        payload.password.length < 10
      )
        throw new Error("Vui lòng nhập tên, email và mật khẩu từ 10 ký tự.");
      if (!["student", "parent", "psychologist"].includes(payload.role))
        throw new Error("Không thể tự đăng ký quyền quản trị.");
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          data: { name: payload.name.trim(), requested_role: payload.role },
        },
      });
      if (error) throw error;
      if (!data.session) {
        setAuthModalTab("login");
        throw new Error(
          "Đăng ký đã được tiếp nhận. Vui lòng kiểm tra email xác minh rồi đăng nhập.",
        );
      }
      return await login({
        emailOrName: payload.email,
        password: payload.password,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Không thể đăng ký.",
      };
    }
  };
  const logout = () => {
    clearSessionState();
    void supabase.auth.signOut({ scope: "local" });
    setAuthModalOpen(true);
  };
  const changeOwnPassword = async (password: string) => {
    try {
      const result = await accountAction("change-password", { password });
      logout();
      return { success: true, message: result.message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Không thể đổi mật khẩu.",
      };
    }
  };
  const runAdmin = async (
    action: string,
    id?: string,
    input: Record<string, unknown> = {},
  ) => {
    try {
      if (!isAuthenticated || currentUser.role !== "admin")
        throw new Error("Bạn không có quyền quản trị tài khoản.");
      const target = users.find((u) => u.id === id);
      const result = await accountAction(action, {
        id,
        version: target?.version,
        ...input,
      });
      if (action === "reset-password" && id === currentUser.id) logout();
      else await reloadFromSqlite();
      return { success: true, message: result.message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật tài khoản.",
      };
    }
  };
  const adminCreateUser = async (userData: Partial<User>) =>
    runAdmin("create", undefined, { user: userData });
  const adminUpdateUser = async (id: string, updates: Partial<User>) =>
    runAdmin("update", id, { updates });
  const adminToggleUserStatus = async (
    id: string,
    status?: "active" | "locked",
  ) =>
    runAdmin("status", id, {
      status:
        status ||
        (users.find((u) => u.id === id)?.status === "locked"
          ? "active"
          : "locked"),
    });
  const adminResetPassword = async (id: string, newPassword?: string) =>
    runAdmin("reset-password", id, { password: newPassword });
  const adminDeleteUser = async (id: string) => runAdmin("delete", id);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"],
      });
    } catch {
      // ignore
    }
  };

  const addAuditLog = (
    action: string,
    resource: string,
    details: string,
    status: "SUCCESS" | "BLOCKED_PRIVACY" = "SUCCESS",
  ) => {
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

    // Send to Supabase API in background
    dataRequest("/api/db/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLog),
    }).catch(() => {});
  };

  const switchUser = (_userId: string) => {
    setAuthModalOpen(true);
  };

  const addHappinessPoints = (
    amount: number,
    source: HappinessPointRecord["source"],
    sourceTitle: string,
  ) => {
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

    // Persist to Supabase
    dataRequest("/api/db/happiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecord),
    }).catch(() => {});
  };

  // 1. Create Emotion Journal in Supabase
  const createJournalEntry = (
    entryData: Omit<
      EmotionJournalEntry,
      "id" | "createdAt" | "parentReactions" | "studentId" | "studentName"
    >,
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
    addAuditLog(
      "CREATE_JOURNAL",
      newId,
      `Học sinh tạo nhật ký cảm xúc [${newEntry.emotionLabel}], quyền: ${newEntry.privacy}`,
    );

    // If shared with parent, notify parent and add points
    if (
      newEntry.privacy === "share_parent" ||
      newEntry.privacy === "share_all"
    ) {
      addHappinessPoints(
        15,
        "journal_share",
        `Chia sẻ nhật ký cảm xúc (${newEntry.emotionLabel})`,
      );
      const parents = users.filter(
        (u) => u.role === "parent" && u.familyId === currentUser.familyId,
      );
      parents.forEach((p) => {
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}-${p.id}`,
            userId: p.id,
            title: `${currentUser.name} vừa chia sẻ nhật ký cảm xúc`,
            message: `Cảm xúc: ${newEntry.emotionLabel}. Hãy xem và gửi lời động viên cho con nhé!`,
            type: "journal",
            isRead: false,
            createdAt: new Date().toISOString(),
            actionTab: "journals",
          },
          ...prev,
        ]);
      });
    }

    // Persist to Cloud Firestore

    // Persist to Supabase DB
    dataRequest("/api/db/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    }).catch((err) =>
      console.error("Failed to save journal to Supabase:", err),
    );

    return newId;
  };

  // 2. Update Journal Privacy in Supabase
  const updateJournalPrivacy = (journalId: string, privacy: JournalPrivacy) => {
    setJournalEntries((prev) =>
      prev.map((j) => (j.id === journalId ? { ...j, privacy } : j)),
    );
    addAuditLog(
      "UPDATE_JOURNAL_PRIVACY",
      journalId,
      `Cập nhật quyền riêng tư nhật ký thành: ${privacy}`,
    );

    dataRequest(`/api/db/journals/${journalId}/privacy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        privacy,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
      }),
    }).catch(() => {});
  };

  // 3. Delete Journal in Supabase
  const deleteJournalEntry = (journalId: string) => {
    setJournalEntries((prev) => prev.filter((j) => j.id !== journalId));
    addAuditLog("DELETE_JOURNAL", journalId, `Xóa nhật ký cảm xúc`);

    dataRequest(
      `/api/db/journals/${journalId}?userId=${encodeURIComponent(currentUser.id)}&userName=${encodeURIComponent(currentUser.name)}`,
      {
        method: "DELETE",
      },
    ).catch(() => {});
  };

  // 4. Add Parent Reaction in Supabase
  const addParentReaction = (
    journalId: string,
    reactionType: "heart" | "hug" | "proud" | "listen",
    comment?: string,
  ) => {
    const roleName =
      currentUser.familyRole === "father"
        ? "Bố " + currentUser.name.split(" ").pop()
        : "Mẹ " + currentUser.name.split(" ").pop();
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
              message: comment
                ? `"${comment}"`
                : `${roleName} đã gửi biểu cảm và động viên bạn.`,
              type: "parent_reacted",
              isRead: false,
              createdAt: new Date().toISOString(),
              actionTab: "journals",
            },
            ...notifs,
          ]);
          return {
            ...j,
            parentReactions: [...j.parentReactions, newReaction],
          };
        }
        return j;
      }),
    );

    addHappinessPoints(
      10,
      "positive_reaction",
      `${roleName} gửi phản hồi khích lệ con`,
    );
    addAuditLog(
      "PARENT_REACTION",
      journalId,
      `Cha mẹ gửi phản hồi [${reactionType}] cho nhật ký con`,
    );

    // Persist to Supabase
    dataRequest(`/api/db/journals/${journalId}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReaction),
    }).catch(() => {});
  };

  // 5. Request Consultation in Supabase
  const requestConsultation = (params: {
    topic: string;
    initialMessage: string;
    psychologistId?: string;
    sharedJournalIds: string[];
  }): string => {
    const psych =
      users.find((u) => u.id === (params.psychologistId || "user-psy-1")) ||
      users.find((u) => u.role === "psychologist");
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
      status: "pending",
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: "student",
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
          : j,
      ),
    );

    if (psych) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-${psych.id}`,
          userId: psych.id,
          title: `Yêu cầu tham vấn mới từ ${currentUser.name}`,
          message: `Chủ đề: "${params.topic}". Kèm theo ${params.sharedJournalIds.length} nhật ký được phân quyền.`,
          type: "consultation_request",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: "consultation",
        },
        ...prev,
      ]);
    }

    addAuditLog(
      "REQUEST_CONSULTATION",
      newId,
      `Học sinh gửi yêu cầu tham vấn tới chuyên gia ${psych?.name || "Tâm lý"} kèm ${params.sharedJournalIds.length} nhật ký`,
    );

    // Persist to Supabase DB
    dataRequest("/api/db/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSession),
    }).catch(() => {});

    return newId;
  };

  // 6. Send Consultation Message in Supabase
  const sendConsultationMessage = (consultationId: string, content: string) => {
    const isPsych = currentUser.role === "psychologist";
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: (isPsych ? "psychologist" : "student") as
        "student" | "psychologist",
      content,
      timestamp: new Date().toISOString(),
    };

    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id === consultationId) {
          const recipientId = isPsych
            ? c.studentId
            : c.psychologistId || "user-psy-1";
          if (recipientId) {
            setNotifications((notifs) => [
              {
                id: `notif-${Date.now()}`,
                userId: recipientId,
                title: `${currentUser.name} vừa gửi tin nhắn tham vấn`,
                message:
                  content.length > 60 ? content.slice(0, 60) + "..." : content,
                type: "consultation_reply",
                isRead: false,
                createdAt: new Date().toISOString(),
                actionTab: "consultation",
              },
              ...notifs,
            ]);
          }
          return {
            ...c,
            status: isPsych ? "awaiting_student" : "in_progress",
            messages: [...c.messages, newMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      }),
    );

    addAuditLog(
      "SEND_CONSULTATION_MESSAGE",
      consultationId,
      `Gửi tin nhắn trong phiên tham vấn (${currentUser.role})`,
    );

    // Persist to Supabase
    dataRequest(`/api/db/consultations/${consultationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMsg),
    }).catch(() => {});
  };

  // 7. Update Consultation Status in Supabase
  const updateConsultationStatus = (
    consultationId: string,
    status: ConsultationStatus,
    officialFeedback?: string,
    nextActionPlan?: string,
    privateNotes?: string,
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
            officialFeedback:
              officialFeedback !== undefined
                ? officialFeedback
                : c.officialFeedback,
            nextActionPlan:
              nextActionPlan !== undefined ? nextActionPlan : c.nextActionPlan,
            privateProfessionalNotes:
              privateNotes !== undefined
                ? privateNotes
                : c.privateProfessionalNotes,
            updatedAt: new Date().toISOString(),
            completedAt:
              status === "completed" ? new Date().toISOString() : c.completedAt,
          };

          if (officialFeedback || status === "completed") {
            setNotifications((notifs) => [
              {
                id: `notif-${Date.now()}`,
                userId: c.studentId,
                title: `Chuyên gia tâm lý đã gửi định hướng cho bạn`,
                message: `Phiên tham vấn "${c.topic}" đã có phản hồi chuyên môn & kế hoạch hành động.`,
                type: "consultation_reply",
                isRead: false,
                createdAt: new Date().toISOString(),
                actionTab: "consultation",
              },
              ...notifs,
            ]);
          }

          return updated;
        }
        return c;
      }),
    );

    addAuditLog(
      "UPDATE_CONSULTATION_STATUS",
      consultationId,
      `Cập nhật trạng thái phiên tham vấn: ${status}`,
    );

    // Persist to Supabase
    dataRequest(`/api/db/consultations/${consultationId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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

  // 8. Deep Talk Sessions in Supabase
  const startDeepTalkSession = (topicId: string): DeepTalkSession => {
    const topic = deepTalkTopics.find((t) => t.id === topicId);
    const newSession: DeepTalkSession = {
      id: `session-dt-${Date.now()}`,
      familyId: family.id,
      topicId,
      topicTitle: topic?.title || "Deep Talk",
      currentQuestionIndex: 0,
      answers: [],
      isCompleted: false,
      startedAt: new Date().toISOString(),
    };

    setDeepTalkSessions((prev) => [newSession, ...prev]);
    addAuditLog(
      "START_DEEP_TALK",
      topicId,
      `Bắt đầu phiên Deep Talk: ${topic?.title}`,
    );

    dataRequest("/api/db/deeptalk/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSession),
    }).catch(() => {});

    return newSession;
  };

  const submitDeepTalkAnswer = (
    sessionId: string,
    questionId: string,
    answer: string,
    isParent: boolean,
  ) => {
    setDeepTalkSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const existingAnswerIndex = s.answers.findIndex(
            (a) => a.questionId === questionId,
          );
          let newAnswers = [...s.answers];
          if (existingAnswerIndex >= 0) {
            newAnswers[existingAnswerIndex] = {
              ...newAnswers[existingAnswerIndex],
              [isParent ? "parentAnswer" : "studentAnswer"]: answer,
            };
          } else {
            newAnswers.push({
              questionId,
              [isParent ? "parentAnswer" : "studentAnswer"]: answer,
            });
          }
          return { ...s, answers: newAnswers };
        }
        return s;
      }),
    );

    dataRequest(`/api/db/deeptalk/sessions/${sessionId}/answer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
          : s,
      ),
    );

    addHappinessPoints(
      points,
      "deeptalk",
      `Hoàn thành Deep Talk: ${session?.topicTitle}`,
    );
    addAuditLog(
      "COMPLETE_DEEP_TALK",
      sessionId,
      `Hoàn tất phiên Deep Talk và cộng ${points} Happiness Points`,
    );

    dataRequest(`/api/db/deeptalk/sessions/${sessionId}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reflection,
        familyId: family.id,
        topicTitle: session?.topicTitle,
      }),
    }).catch(() => {});
  };

  // 9. Challenge 30 Days in Supabase
  const confirmChallengeTask = (
    day: number,
    role: "student" | "parent",
    note?: string,
  ) => {
    const task = challengeTasks.find((t) => t.day === day);
    const points = task?.points || 30;

    setChallengeProgress((prev) => {
      const existing = prev.find((p) => p.day === day);
      let updatedList = [...prev];

      if (existing) {
        const studentDone =
          role === "student" ? true : existing.studentConfirmed;
        const parentDone = role === "parent" ? true : existing.parentConfirmed;
        const nowCompleted = studentDone && parentDone;

        updatedList = prev.map((p) =>
          p.day === day
            ? {
                ...p,
                studentConfirmed: studentDone,
                parentConfirmed: parentDone,
                isCompleted: nowCompleted,
                completedAt: nowCompleted
                  ? p.completedAt || new Date().toISOString()
                  : p.completedAt,
                note: note || p.note,
              }
            : p,
        );

        if (nowCompleted && !existing.isCompleted) {
          addHappinessPoints(
            points,
            "challenge",
            `Hoàn thành Thử thách Ngày ${day}: ${task?.title}`,
          );
        }
      } else {
        const studentDone = role === "student";
        const parentDone = role === "parent";
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
          addHappinessPoints(
            points,
            "challenge",
            `Hoàn thành Thử thách Ngày ${day}: ${task?.title}`,
          );
        }
      }

      return updatedList;
    });

    addAuditLog(
      "CONFIRM_CHALLENGE",
      `day-${day}`,
      `${role === "student" ? "Học sinh" : "Cha mẹ"} xác nhận hoàn thành ngày ${day}`,
    );

    dataRequest(`/api/db/challenges/${day}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    dataRequest(`/api/db/notifications/${id}/read`, { method: "PUT" }).catch(
      () => {},
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.userId === currentUser.id ? { ...n, isRead: true } : n,
      ),
    );
    dataRequest("/api/db/notifications/read-all", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    const currentActive =
      families.find((f) => f.id === activeFamilyId) ||
      families[0] ||
      EMPTY_FAMILY;
    setFamily(currentActive);
  }, [currentUser, families, activeFamilyId]);

  // Family Helper Functions
  const getFamilyMembers = (targetFamilyId: string) => {
    const fam = families.find((f) => f.id === targetFamilyId) || family;
    const studentIds = fam ? fam.studentIds : [];
    const parentIds = fam ? fam.parentIds : [];
    const students = users.filter(
      (u) =>
        studentIds.includes(u.id) ||
        (u.familyId === fam?.id && u.role === "student"),
    );
    const parents = users.filter(
      (u) =>
        parentIds.includes(u.id) ||
        (u.familyId === fam?.id && u.role === "parent"),
    );
    return { students, parents };
  };

  const switchActiveFamily = (targetFamilyId: string) => {
    const match = families.find((f) => f.id === targetFamilyId);
    if (match) {
      setActiveFamilyId(targetFamilyId);
      setFamily(match);
    }
  };

  const runFamily = async (
    resource: string,
    id: string | undefined,
    operation: string,
    payload: any = {},
    method = "POST",
  ) => {
    try {
      const result = await accountAction("family", {
        resource,
        id,
        operation,
        payload,
        method,
      });
      await reloadFromSqlite();
      return {
        success: true,
        message: result.message || "Đã lưu thay đổi gia đình.",
        family: result.family,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lưu thay đổi gia đình.",
      };
    }
  };
  const joinFamilyWithCode = async (code: string) =>
    runFamily("family", undefined, "join", { familyCode: code });
  const createFamily = async (
    name: string,
    avatarIcon?: string,
    description?: string,
  ) =>
    runFamily("families", "create", "create", {
      name,
      avatarIcon,
      description,
    });
  const updateFamilyDetails = async (id: string, updates: Partial<Family>) =>
    runFamily("families", id, "PUT", updates, "PUT");
  const linkUserToFamily = async (
    id: string,
    userId: string,
    familyRole?: FamilyRole,
  ) => runFamily("families", id, "add-member", { userId, familyRole });
  const removeUserFromFamily = async (id: string, userId: string) =>
    runFamily("families", id, "remove-member", { userId });
  const sendFamilyInvitation = async (
    recipientEmailOrPhone: string,
    targetFamilyRole: FamilyRole,
  ) =>
    runFamily("family-invitations", undefined, "POST", {
      id: crypto.randomUUID(),
      familyId: family.id,
      familyName: family.name,
      recipientEmailOrPhone,
      targetFamilyRole,
      senderRole: currentUser.role,
      createdAt: new Date().toISOString(),
    });
  const respondToInvitation = async (id: string, accept: boolean) =>
    runFamily("family-invitations", id, "respond", {
      status: accept ? "accepted" : "declined",
    });
  const adminDeleteFamily = async (id: string) =>
    runFamily("families", id, "DELETE", {}, "DELETE");

  const adminAddChallengeTask = (task: Challenge30DayTask) => {
    setChallengeTasks((prev) => [...prev, task]);
    void saveCloudDocument("challenge_tasks", String(task.day), task).catch(
      () =>
        window.dispatchEvent(
          new CustomEvent("codegenz-sync-error", {
            detail: "Chưa lưu được thử thách.",
          }),
        ),
    );
    addAuditLog(
      "ADMIN_ADD_CHALLENGE",
      `day-${task.day}`,
      `Quản trị viên thêm nhiệm vụ thử thách Ngày ${task.day}`,
    );
  };

  const adminAddDeepTalkTopic = (topic: DeepTalkTopic) => {
    setDeepTalkTopics((prev) => [...prev, topic]);
    void saveCloudDocument("deep_talk_topics", topic.id, topic).catch(() =>
      window.dispatchEvent(
        new CustomEvent("codegenz-sync-error", {
          detail: "Chưa lưu được chủ đề.",
        }),
      ),
    );
    addAuditLog(
      "ADMIN_ADD_DEEPTALK",
      topic.id,
      `Quản trị viên thêm chủ đề Deep Talk: ${topic.title}`,
    );
  };

  // RBAC and Privacy filter: Strictly respect user roles and privacy boundaries!
  const getFilteredJournalsForUser = (user: User): EmotionJournalEntry[] => {
    if (!isAuthenticated) {
      return [];
    }
    // 1. Student: ONLY sees their own journals
    if (user.role === "student") {
      return journalEntries.filter((j) => j.studentId === user.id);
    }
    // 2. Parent: ONLY sees journals of their own children (same family) that are shared with parents
    if (user.role === "parent") {
      return journalEntries.filter(
        (j) =>
          (j.familyId === user.familyId || (!j.familyId && user.familyId)) &&
          (j.privacy === "share_parent" ||
            j.privacy === "share_all" ||
            (j.privacy as any) === "parents_only" ||
            (j.privacy as any) === "family_open"),
      );
    }
    // 3. Psychologist: ONLY sees journals explicitly shared with psychologist or attached to active consultations
    if (user.role === "psychologist") {
      const consultationJournalIds = consultations
        .filter((c) => c.psychologistId === user.id || !c.psychologistId)
        .flatMap((c) => c.sharedJournalIds);

      return journalEntries.filter(
        (j) =>
          j.privacy === "share_psychologist" ||
          j.privacy === "share_all" ||
          (j.privacy as any) === "psychologist_only" ||
          consultationJournalIds.includes(j.id),
      );
    }
    // 4. Admin: Zero-Trust Privacy - Admin CANNOT view private psychological journals of users
    if (user.role === "admin") {
      return [];
    }
    return [];
  };

  // RBAC for Consultations: Strict confidentiality between Student and Psychologist
  const getFilteredConsultationsForUser = (
    user: User,
  ): ConsultationSession[] => {
    if (!isAuthenticated) {
      return [];
    }
    // 1. Student: ONLY sees consultations they requested
    if (user.role === "student") {
      return consultations.filter((c) => c.studentId === user.id);
    }
    // 2. Psychologist: Sees consultations assigned to them or unassigned waiting for intake
    if (user.role === "psychologist") {
      return consultations.filter(
        (c) => c.psychologistId === user.id || !c.psychologistId,
      );
    }
    // 3. Parent & Admin: Zero access to confidential student-psychologist consultation sessions
    return [];
  };

  // Get full structured database snapshot
  const getFullDatabaseSnapshot = (): AppFullDatabase => {
    return {
      version: "1.0",
      exportDate: new Date().toISOString(),
      system: "CODE GenZ Family Platform (Supabase 3 Powered)",
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
  const syncDataToServerNow = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      await flushDataRequests();
      await reloadFromSqlite();
      return {
        success: true,
        message: "Đã đồng bộ dữ liệu được phép truy cập từ Supabase.",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể đồng bộ Supabase.",
      };
    }
  };
  const restoreFullDatabase = async (
    _data: Partial<AppFullDatabase>,
    _mergeMode: "overwrite" | "merge" = "overwrite",
  ) => ({
    success: false,
    message:
      "Khôi phục toàn bộ dữ liệu cần chạy công cụ migration có kiểm tra đối soát. Không thể ghi đè tài khoản Auth từ trình duyệt.",
  });
  const resetToInitialData = async () => {
    throw new Error(
      "Không cho phép xóa dữ liệu thật và thay bằng dữ liệu mẫu.",
    );
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
        authReady,
        authError,
        syncError,
        mustChangePassword,
        changeOwnPassword,
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
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
