import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { registerAiRoutes } from "./server/aiRoutes";
import dotenv from "dotenv";
import {
  initSqliteDatabase,
  resetDatabaseToSeed,
  getAllUsers,
  getUserById,
  findUserByEmailOrName,
  createUser,
  updateUser,
  updateUserLastLogin,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  getAllFamilies,
  getFamilyById,
  findFamilyByCode,
  createFamily,
  updateFamily,
  deleteFamily,
  addMemberToFamily,
  removeMemberFromFamily,
  getAllFamilyInvitations,
  createFamilyInvitation,
  respondFamilyInvitation,
  getAllJournals,
  createJournalEntry,
  updateJournalPrivacy,
  deleteJournalEntry,
  addParentReaction,
  getAllFamilyJournals,
  createFamilyJournal,
  updateFamilyJournal,
  deleteFamilyJournal,
  addFamilyJournalReaction,
  addFamilyJournalComment,
  getAllConsultations,
  createConsultation,
  addConsultationMessage,
  updateConsultationStatus,
  getAllDeepTalkTopics,
  getAllDeepTalkSessions,
  createDeepTalkSession,
  updateDeepTalkAnswer,
  completeDeepTalkSession,
  getAllChallengeTasks,
  getAllChallengeProgress,
  confirmChallengeDay,
  getAllHappinessHistory,
  addHappinessRecord,
  getAllNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getAllAuditLogs,
  addAuditLog,
  joinFamilyWithCode,
  getFullSqliteSnapshot,
  restoreFullSnapshot,
} from "./server/sqliteDb";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize SQLite database instance (with auto-seeding if empty)
  await initSqliteDatabase();

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "CODE GenZ Family API",
      database: "SQLite 3 (Persistent)",
      storageFile: "data-storage/codegenz.sqlite",
    });
  });

  // ==========================================
  // AUTHENTICATION & USER MANAGEMENT API
  // ==========================================

  // Register new user
  app.post("/api/auth/register", (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        familyRole,
        familyCode,
        grade,
        title,
        bio,
        phone,
        avatar,
      } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ success: false, error: "Vui lòng điền đầy đủ Họ tên, Email và Vai trò." });
      }

      // Check if user already exists
      const existingUser = findUserByEmailOrName(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác." });
      }

      // Role-based default permissions
      const defaultPermissions = {
        canCreateJournal: true,
        canViewFamilyJournals: true,
        canRequestConsultation: role === "student" || role === "admin",
        canManageConsultations: role === "psychologist" || role === "admin",
        canManageChallenges: role === "admin",
        canManageDeeptalk: role === "admin",
        canManageUsers: role === "admin",
        canAuditLogs: role === "admin",
        canExportDatabase: role === "admin",
      };

      // Generate Avatar if not provided
      const defaultAvatar =
        avatar ||
        (role === "student"
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          : role === "parent"
          ? (familyRole === "father"
            ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
            : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80")
          : role === "psychologist"
          ? "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80");

      const newUserId = `user-${role}-${Date.now().toString(36)}`;
      let targetFamilyId: string | undefined = undefined;

      if (role === "student") {
        if (familyCode && familyCode.trim()) {
          const matchedFam = findFamilyByCode(familyCode.trim());
          if (matchedFam) {
            targetFamilyId = matchedFam.id;
          }
        }
        if (!targetFamilyId) {
          // Create new distinct family for this student
          const newFamId = `family-${Date.now()}`;
          const newFamCode = `CODE-${Math.floor(1000 + Math.random() * 9000)}`;
          createFamily({
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
          });
          targetFamilyId = newFamId;
        }
      } else if (role === "parent") {
        if (familyCode && familyCode.trim()) {
          const matchedFam = findFamilyByCode(familyCode.trim());
          if (matchedFam) {
            targetFamilyId = matchedFam.id;
          }
        }
      }

      const newUser = {
        id: newUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password || "password123",
        role,
        familyRole: familyRole || (role === "student" ? "student" : role === "parent" ? "mother" : "none"),
        avatar: defaultAvatar,
        familyId: targetFamilyId,
        grade: grade || (role === "student" ? "Lớp 11 – THPT" : undefined),
        title: title || (role === "psychologist" ? "Chuyên viên Tham vấn Tâm lý" : undefined),
        bio: bio || `Thành viên mới tham gia nền tảng CODE GenZ Family.`,
        phone: phone || undefined,
        verified: role === "psychologist" ? false : true,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        permissions: defaultPermissions,
      };

      createUser(newUser);

      // If user provided a family code and targetFamily was matched, link member
      if (familyCode && familyCode.trim() && targetFamilyId) {
        joinFamilyWithCode(newUserId, role, familyCode.trim());
      }

      // Welcome Notification
      addNotification({
        id: `notif-welcome-${Date.now()}`,
        userId: newUserId,
        title: `Chào mừng bạn đến với CODE GenZ Family! 🎉`,
        message: `Tài khoản ${newUser.name} đã được khởi tạo thành công với vai trò ${
          role === "student" ? "Học sinh THPT" : role === "parent" ? "Phụ huynh" : role === "psychologist" ? "Chuyên gia Tâm lý" : "Quản trị viên"
        }. Hãy bắt đầu khám phá nhật ký cảm xúc và các công cụ gắn kết gia đình.`,
        type: "system",
        isRead: false,
        createdAt: new Date().toISOString(),
        actionTab: "dashboard",
      });

      // Audit Log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: newUserId,
        userName: newUser.name,
        userRole: role,
        action: "USER_REGISTER",
        resource: "users",
        details: `Đăng ký tài khoản mới thành công [Email: ${newUser.email}, Vai trò: ${role}]`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      const { password: _, ...userSafe } = newUser;
      res.json({ success: true, user: userSafe, message: "Đăng ký tài khoản thành công!" });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ success: false, error: err.message || "Lỗi đăng ký tài khoản" });
    }
  });

  // Login user
  app.post("/api/auth/login", (req, res) => {
    try {
      const { emailOrName, password } = req.body;

      if (!emailOrName) {
        return res.status(400).json({ success: false, error: "Vui lòng nhập Email hoặc Tên đăng nhập." });
      }

      const user = findUserByEmailOrName(emailOrName);
      if (!user) {
        return res.status(404).json({ success: false, error: "Không tìm thấy tài khoản với thông tin này. Vui lòng kiểm tra lại hoặc Đăng ký." });
      }

      // Check if user is locked
      if (user.status === "locked") {
        addAuditLog({
          id: `log-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: "LOGIN_BLOCKED",
          resource: "auth",
          details: `Đăng nhập thất bại do tài khoản đã bị khóa bởi Quản trị viên`,
          timestamp: new Date().toISOString(),
          status: "FAILED",
        });
        return res.status(403).json({ success: false, error: "Tài khoản của bạn hiện đang bị TẠM KHÓA bởi Quản trị viên. Vui lòng liên hệ ban quản trị để được hỗ trợ." });
      }

      // Verify password if provided
      if (password && user.password && user.password !== password) {
        addAuditLog({
          id: `log-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: "LOGIN_FAILED",
          resource: "auth",
          details: `Sai mật khẩu khi đăng nhập tài khoản ${user.email}`,
          timestamp: new Date().toISOString(),
          status: "FAILED",
        });
        return res.status(401).json({ success: false, error: "Mật khẩu không chính xác. Vui lòng thử lại hoặc sử dụng tính năng Đăng nhập nhanh." });
      }

      // Update last login
      updateUserLastLogin(user.id);

      // Audit Log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "USER_LOGIN",
        resource: "auth",
        details: `Đăng nhập thành công vào hệ thống`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      const { password: _, ...userSafe } = user;
      res.json({ success: true, user: userSafe, message: `Chào mừng ${user.name} quay trở lại!` });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, error: err.message || "Lỗi đăng nhập" });
    }
  });

  // Get all users
  app.get("/api/auth/users", (_req, res) => {
    try {
      const users = getAllUsers();
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Create User
  app.post("/api/admin/users/create", (req, res) => {
    try {
      const userData = req.body;
      if (!userData.name || !userData.email || !userData.role) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin người dùng bắt buộc." });
      }

      const existing = findUserByEmailOrName(userData.email);
      if (existing) {
        return res.status(400).json({ success: false, error: "Email này đã tồn tại trong hệ thống." });
      }

      const newId = userData.id || `user-${userData.role}-${Date.now().toString(36)}`;
      const userToCreate = {
        ...userData,
        id: newId,
        avatar: userData.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        status: userData.status || "active",
        verified: userData.verified !== undefined ? userData.verified : true,
        createdAt: new Date().toISOString(),
        password: userData.password || "password123",
        permissions: userData.permissions || {},
      };

      createUser(userToCreate);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: "user-admin-1",
        userName: "Admin Hệ Thống",
        userRole: "admin",
        action: "ADMIN_CREATE_USER",
        resource: "users",
        details: `Admin tạo tài khoản mới: ${userToCreate.name} (${userToCreate.email}) vai trò ${userToCreate.role}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, data: userToCreate, message: "Đã tạo tài khoản người dùng mới thành công." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Update User & Permissions
  app.put("/api/admin/users/:id", (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      const existing = getUserById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Không tìm thấy người dùng." });
      }

      const mergedUser = {
        ...existing,
        ...updatedData,
        id,
      };

      updateUser(mergedUser);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: "user-admin-1",
        userName: "Admin Hệ Thống",
        userRole: "admin",
        action: "ADMIN_UPDATE_USER",
        resource: "users",
        details: `Admin cập nhật thông tin/phân quyền người dùng ID: ${id} (${mergedUser.name}) - vai trò ${mergedUser.role}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, data: mergedUser, message: "Cập nhật thông tin & phân quyền người dùng thành công." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Toggle Lock/Unlock User Status
  app.post("/api/admin/users/:id/toggle-status", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const existing = getUserById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Không tìm thấy người dùng." });
      }

      const newStatus = status || (existing.status === "locked" ? "active" : "locked");
      updateUserStatus(id, newStatus);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: "user-admin-1",
        userName: "Admin Hệ Thống",
        userRole: "admin",
        action: newStatus === "locked" ? "ADMIN_LOCK_USER" : "ADMIN_UNLOCK_USER",
        resource: "users",
        details: `Admin ${newStatus === "locked" ? "KHÓA" : "MỞ KHÓA"} tài khoản ID: ${id} (${existing.name})`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, newStatus, message: `Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} tài khoản thành công.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Reset Password
  app.post("/api/admin/users/:id/reset-password", (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const passToSet = newPassword || "password123";

      resetUserPassword(id, passToSet);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: "user-admin-1",
        userName: "Admin Hệ Thống",
        userRole: "admin",
        action: "ADMIN_RESET_PASSWORD",
        resource: "users",
        details: `Admin đặt lại mật khẩu cho tài khoản ID: ${id}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: `Đã đặt lại mật khẩu cho tài khoản. Mật khẩu mới là: ${passToSet}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Delete User
  app.delete("/api/admin/users/:id", (req, res) => {
    try {
      const { id } = req.params;
      const existing = getUserById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Không tìm thấy người dùng." });
      }

      deleteUser(id);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: "user-admin-1",
        userName: "Admin Hệ Thống",
        userRole: "admin",
        action: "ADMIN_DELETE_USER",
        resource: "users",
        details: `Admin xóa tài khoản ID: ${id} (${existing.name} - ${existing.email})`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã xóa tài khoản người dùng thành công." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // SQLITE DATABASE CRUD API ENDPOINTS
  // ==========================================

  // 1. Bootstrap: Fetch all SQLite data in one request for initial client load
  app.get("/api/db/bootstrap", (_req, res) => {
    try {
      const data = getFullSqliteSnapshot();
      res.json({ success: true, source: "sqlite", data });
    } catch (err: any) {
      console.error("Bootstrap SQLite error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Reset database to initial seed data
  app.post("/api/db/reset", (_req, res) => {
    try {
      resetDatabaseToSeed();
      const freshData = getFullSqliteSnapshot();
      res.json({ success: true, message: "Đã tái lập cơ sở dữ liệu SQLite về dữ liệu gốc thành công.", data: freshData });
    } catch (err: any) {
      console.error("Reset SQLite error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Journals CRUD
  app.get("/api/db/journals", (_req, res) => {
    try {
      const journals = getAllJournals();
      res.json({ success: true, data: journals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/journals", (req, res) => {
    try {
      const entry = req.body;
      createJournalEntry(entry);

      // If shared with parents, create a notification & award happiness points
      if (entry.privacy === "parents_only" || entry.privacy === "family_open") {
        const family = getAllFamilies()[0];
        if (family) {
          addHappinessRecord({
            id: `happy-jr-${Date.now()}`,
            familyId: family.id,
            amount: 15,
            source: "journal_share",
            sourceTitle: `Chia sẻ nhật ký cảm xúc (${entry.emotionLabel})`,
            createdAt: new Date().toISOString(),
          });

          // Notify parents
          family.parentIds.forEach((pid) => {
            addNotification({
              id: `notif-${Date.now()}-${pid}`,
              userId: pid,
              title: "Nhật ký cảm xúc mới từ con",
              message: `${entry.studentName} vừa chia sẻ nhật ký cảm xúc: "${entry.emotionLabel}". Hãy vào gửi một cái ôm hoặc lời nhắn động viên con nhé!`,
              type: "journal",
              isRead: false,
              createdAt: new Date().toISOString(),
              actionTab: "journals",
            });
          });
        }
      }

      // Security audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: entry.studentId,
        userName: entry.studentName,
        userRole: "student",
        action: "CREATE_JOURNAL",
        resource: "emotion_journals",
        details: `Tạo nhật ký cảm xúc ID: ${entry.id} [${entry.emotionLabel} - mức độ ${entry.intensity}/10, chế độ ${entry.privacy}]`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã lưu nhật ký vào cơ sở dữ liệu SQLite." });
    } catch (err: any) {
      console.error("Create journal SQLite error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/db/journals/:id/privacy", (req, res) => {
    try {
      const { id } = req.params;
      const { privacy, userId, userName, userRole } = req.body;
      updateJournalPrivacy(id, privacy);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: userId || "user-student-1",
        userName: userName || "Học sinh",
        userRole: userRole || "student",
        action: "UPDATE_PRIVACY",
        resource: "emotion_journals",
        details: `Cập nhật quyền riêng tư nhật ký ${id} sang ${privacy}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Cập nhật quyền riêng tư SQLite thành công." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/db/journals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { userId, userName } = req.query;
      deleteJournalEntry(id);

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: (userId as string) || "user-student-1",
        userName: (userName as string) || "Học sinh",
        userRole: "student",
        action: "DELETE_JOURNAL",
        resource: "emotion_journals",
        details: `Xóa nhật ký cảm xúc ID ${id} khỏi SQLite`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã xóa nhật ký khỏi SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/journals/:id/reaction", (req, res) => {
    try {
      const { id } = req.params;
      const reaction = req.body;
      addParentReaction(id, reaction);

      // Add happiness points (+10)
      const family = getAllFamilies()[0];
      if (family) {
        addHappinessRecord({
          id: `happy-rx-${Date.now()}`,
          familyId: family.id,
          amount: 10,
          source: "positive_reaction",
          sourceTitle: `${reaction.parentName} phản hồi nhật ký của con`,
          createdAt: new Date().toISOString(),
        });
      }

      // Notify student
      const allJournals = getAllJournals();
      const targetJournal = allJournals.find((j) => j.id === id);
      if (targetJournal) {
        addNotification({
          id: `notif-${Date.now()}`,
          userId: targetJournal.studentId,
          title: "Cha mẹ đã phản hồi nhật ký của bạn",
          message: `${reaction.parentName} (${reaction.parentRoleName}) vừa gửi biểu cảm và thông điệp yêu thương tới nhật ký của bạn.`,
          type: "reaction",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: "journals",
        });
      }

      // Audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: reaction.parentId,
        userName: reaction.parentName,
        userRole: "parent",
        action: "ADD_REACTION",
        resource: "emotion_journals",
        details: `Phụ huynh gửi phản hồi [${reaction.reactionType}] tới nhật ký ID ${id}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã lưu phản hồi của phụ huynh vào SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Consultation Sessions CRUD
  app.get("/api/db/consultations", (_req, res) => {
    try {
      const list = getAllConsultations();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/consultations", (req, res) => {
    try {
      const consultation = req.body;
      createConsultation(consultation);

      // Notify psychologists
      const users = getAllUsers();
      const psychologists = users.filter((u) => u.role === "psychologist");
      psychologists.forEach((psy) => {
        addNotification({
          id: `notif-${Date.now()}-${psy.id}`,
          userId: psy.id,
          title: "Yêu cầu tham vấn mới từ học sinh",
          message: `Học sinh ${consultation.studentName} đã gửi yêu cầu tham vấn: "${consultation.topic}".`,
          type: "consultation",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: "consultation",
        });
      });

      // Audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: consultation.studentId,
        userName: consultation.studentName,
        userRole: "student",
        action: "CREATE_CONSULTATION",
        resource: "consultation_sessions",
        details: `Học sinh gửi yêu cầu tham vấn tâm lý ID: ${consultation.id} chủ đề "${consultation.topic}"`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã lưu phiên tham vấn vào SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/consultations/:id/messages", (req, res) => {
    try {
      const { id } = req.params;
      const message = req.body;
      addConsultationMessage(id, message);

      // Notify counterparty
      const consultations = getAllConsultations();
      const session = consultations.find((c) => c.id === id);
      if (session) {
        const targetUserId = message.senderRole === "student" ? (session.psychologistId || "user-psy-1") : session.studentId;
        addNotification({
          id: `notif-${Date.now()}`,
          userId: targetUserId,
          title: `Tin nhắn tham vấn mới từ ${message.senderName}`,
          message: message.content.length > 80 ? message.content.slice(0, 80) + "..." : message.content,
          type: "consultation",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: "consultation",
        });
      }

      // Audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: message.senderId,
        userName: message.senderName,
        userRole: message.senderRole,
        action: "SEND_MESSAGE",
        resource: "consultation_sessions",
        details: `Gửi tin nhắn trong phiên tham vấn ID ${id}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã lưu tin nhắn tham vấn vào SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/db/consultations/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status, officialFeedback, nextActionPlan, privateNotes, psychologistId, psychologistName } = req.body;
      updateConsultationStatus(id, status, officialFeedback, nextActionPlan, privateNotes);

      // If official feedback provided, notify student
      const consultations = getAllConsultations();
      const session = consultations.find((c) => c.id === id);
      if (session && officialFeedback) {
        addNotification({
          id: `notif-${Date.now()}`,
          userId: session.studentId,
          title: "Chuyên gia đã gửi đánh giá & giải pháp tham vấn",
          message: `Chuyên gia tâm lý đã cập nhật đánh giá chuyên môn và kế hoạch hành động cho phiên tham vấn "${session.topic}".`,
          type: "consultation",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: "consultation",
        });
      }

      // Audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: psychologistId || "user-psy-1",
        userName: psychologistName || "Chuyên gia tâm lý",
        userRole: "psychologist",
        action: "UPDATE_CONSULTATION_STATUS",
        resource: "consultation_sessions",
        details: `Cập nhật trạng thái phiên tham vấn ID ${id} sang ${status}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã cập nhật trạng thái tham vấn trong SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Deep Talk Sessions CRUD
  app.post("/api/db/deeptalk/sessions", (req, res) => {
    try {
      const session = req.body;
      createDeepTalkSession(session);
      res.json({ success: true, message: "Đã tạo phiên Deep Talk trong SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/db/deeptalk/sessions/:id/answer", (req, res) => {
    try {
      const { id } = req.params;
      const { questionId, answer, isParent } = req.body;
      updateDeepTalkAnswer(id, questionId, answer, isParent);
      res.json({ success: true, message: "Đã lưu câu trả lời Deep Talk vào SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/db/deeptalk/sessions/:id/complete", (req, res) => {
    try {
      const { id } = req.params;
      const { reflection, familyId, topicTitle } = req.body;
      completeDeepTalkSession(id, reflection);

      // Award 50 happiness points
      if (familyId) {
        addHappinessRecord({
          id: `happy-dt-${Date.now()}`,
          familyId,
          amount: 50,
          source: "deeptalk",
          sourceTitle: `Hoàn thành Deep Talk: ${topicTitle || "Đối thoại sâu gia đình"}`,
          createdAt: new Date().toISOString(),
        });
      }

      // Audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: "system",
        userName: "Gia đình",
        userRole: "student",
        action: "COMPLETE_DEEP_TALK",
        resource: "deep_talk_sessions",
        details: `Hoàn thành phiên Deep Talk ID ${id}, cộng 50 điểm gắn kết`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã hoàn thành phiên Deep Talk trong SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Challenge 30 Days CRUD
  app.post("/api/db/challenges/:day/confirm", (req, res) => {
    try {
      const day = Number(req.params.day);
      const { role, note, userName, userId, title, points } = req.body;
      const result = confirmChallengeDay(day, role, note);

      // If day newly completed by both sides
      if (result.nowCompleted) {
        const family = getAllFamilies()[0];
        if (family) {
          addHappinessRecord({
            id: `happy-ch-${Date.now()}`,
            familyId: family.id,
            amount: points || 30,
            source: "challenge",
            sourceTitle: `Cả hai bên hoàn thành Ngày ${day}: ${title || "Thử thách 30 ngày"}`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Audit log
      addAuditLog({
        id: `log-${Date.now()}`,
        userId: userId || `user-${role}-1`,
        userName: userName || (role === "student" ? "Học sinh" : "Phụ huynh"),
        userRole: role,
        action: "CONFIRM_CHALLENGE",
        resource: "challenge_progress",
        details: `${role === "student" ? "Học sinh" : "Phụ huynh"} xác nhận hoàn thành Ngày ${day}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, message: "Đã cập nhật tiến độ thử thách vào SQLite.", nowCompleted: result.nowCompleted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Happiness Points CRUD
  app.post("/api/db/happiness", (req, res) => {
    try {
      const record = req.body;
      addHappinessRecord(record);
      res.json({ success: true, message: "Đã cập nhật điểm hạnh phúc SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Notifications CRUD
  app.put("/api/db/notifications/:id/read", (req, res) => {
    try {
      const { id } = req.params;
      markNotificationRead(id);
      res.json({ success: true, message: "Đã đánh dấu thông báo đọc trong SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/db/notifications/read-all", (req, res) => {
    try {
      const { userId } = req.body;
      markAllNotificationsRead(userId);
      res.json({ success: true, message: "Đã đánh dấu tất cả thông báo đọc trong SQLite." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Family Operations & Management
  app.get("/api/db/families", (_req, res) => {
    try {
      const families = getAllFamilies();
      res.json({ success: true, data: families });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/db/families/:id", (req, res) => {
    try {
      const family = getFamilyById(req.params.id);
      if (!family) return res.status(404).json({ success: false, error: "Không tìm thấy nhóm gia đình." });
      res.json({ success: true, data: family });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/families/create", (req, res) => {
    try {
      const { name, familyCode, creatorId, creatorRole, avatarIcon, description } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Tên nhóm gia đình là bắt buộc." });

      const code = familyCode || `CODE-${Math.floor(1000 + Math.random() * 9000)}`;
      const existing = findFamilyByCode(code);
      if (existing) {
        return res.status(400).json({ success: false, error: "Mã gia đình này đã tồn tại, vui lòng chọn mã khác." });
      }

      const newFamily = {
        id: `family-${Date.now().toString(36)}`,
        name,
        familyCode: code.toUpperCase(),
        studentIds: creatorRole === "student" && creatorId ? [creatorId] : [],
        parentIds: creatorRole === "parent" && creatorId ? [creatorId] : [],
        happinessPoints: 100,
        streakDays: 1,
        createdAt: new Date().toISOString(),
        avatarIcon: avatarIcon || "🏡",
        description: description || `Tổ ấm ${name}`,
      };

      createFamily(newFamily);

      if (creatorId) {
        updateUser({
          ...getUserById(creatorId)!,
          familyId: newFamily.id,
        });
      }

      addAuditLog({
        id: `log-${Date.now()}`,
        userId: creatorId || "system",
        userName: "Người dùng",
        userRole: (creatorRole as any) || "student",
        action: "CREATE_FAMILY",
        resource: "families",
        details: `Tạo nhóm gia đình mới: "${name}" (Mã: ${newFamily.familyCode})`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ success: true, data: newFamily, message: `Đã tạo nhóm gia đình "${name}" thành công!` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/db/families/:id", (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const existing = getFamilyById(id);
      if (!existing) return res.status(404).json({ success: false, error: "Không tìm thấy nhóm gia đình." });

      const updated = { ...existing, ...updates };
      updateFamily(updated);
      res.json({ success: true, data: updated, message: "Đã cập nhật thông tin nhóm gia đình." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/db/families/:id", (req, res) => {
    try {
      const { id } = req.params;
      deleteFamily(id);
      res.json({ success: true, message: "Đã xóa nhóm gia đình." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/families/:id/add-member", (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role, familyRole } = req.body;
      const result = addMemberToFamily(id, userId, role, familyRole);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/families/:id/remove-member", (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const result = removeMemberFromFamily(id, userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Family Code Join
  app.post("/api/db/family/join", (req, res) => {
    try {
      const { userId, userRole, code } = req.body;
      const result = joinFamilyWithCode(userId, userRole, code);
      if (result.success) {
        addAuditLog({
          id: `log-${Date.now()}`,
          userId,
          userName: userRole === "student" ? "Học sinh" : "Phụ huynh",
          userRole,
          action: "JOIN_FAMILY",
          resource: "families",
          details: `Kết nối thành công vào gia đình mã ${code}`,
          timestamp: new Date().toISOString(),
          status: "SUCCESS",
        });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Family Invitations
  app.get("/api/db/family-invitations", (_req, res) => {
    try {
      const invitations = getAllFamilyInvitations();
      res.json({ success: true, data: invitations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/family-invitations", (req, res) => {
    try {
      const inv = req.body;
      createFamilyInvitation(inv);

      // Check if recipient is an existing user to push notification
      const user = findUserByEmailOrName(inv.recipientEmailOrPhone);
      if (user) {
        addNotification({
          id: `notif-${Date.now()}`,
          userId: user.id,
          title: "Lời mời kết nối gia đình mới",
          message: `${inv.senderName} (${inv.senderRole === 'student' ? 'Con' : 'Phụ huynh'}) đã gửi lời mời bạn tham gia nhóm gia đình "${inv.familyName}". Mã: ${inv.familyCode}`,
          type: "system",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionTab: "family",
        });
      }

      res.json({ success: true, message: `Đã gửi lời mời kết nối tới ${inv.recipientEmailOrPhone} thành công!` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/family-invitations/:id/respond", (req, res) => {
    try {
      const { id } = req.params;
      const { status, userId, userRole, familyId } = req.body;
      const result = respondFamilyInvitation(id, status);

      if (status === "accepted" && userId && familyId) {
        addMemberToFamily(familyId, userId, userRole);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Audit Log Add
  app.post("/api/db/audit", (req, res) => {
    try {
      const log = req.body;
      addAuditLog(log);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Full Restore / Sync Snapshot into SQLite
  app.post("/api/db/restore", (req, res) => {
    try {
      const { data } = req.body;
      const result = restoreFullSnapshot(data);
      const snapshot = getFullSqliteSnapshot();
      res.json({ ...result, data: snapshot });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Raw SQLite Database File Download
  app.get("/api/db/sqlite-file", (_req, res) => {
    try {
      const dbFile = path.join(process.cwd(), "data-storage", "codegenz.sqlite");
      if (fs.existsSync(dbFile)) {
        res.setHeader("Content-Type", "application/x-sqlite3");
        res.setHeader("Content-Disposition", `attachment; filename="codegenz_${new Date().toISOString().slice(0,10)}.sqlite"`);
        return res.sendFile(dbFile);
      }
      res.status(404).send("Tệp SQLite chưa được tạo.");
    } catch (err: any) {
      res.status(500).send("Lỗi tải tệp SQLite");
    }
  });

  registerAiRoutes(app);

  // Long-Term Data Storage & Database Persistence Endpoints
  const DATA_DIR = path.join(process.cwd(), "data-storage");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Save full database snapshot to server disk
  app.post("/api/data/save-backup", (req, res) => {
    try {
      const { jsonBackup, xmlBackup, timestamp } = req.body;
      const backupDate = timestamp || new Date().toISOString().replace(/[:.]/g, "-");

      if (jsonBackup) {
        fs.writeFileSync(path.join(DATA_DIR, "codegenz_latest.json"), JSON.stringify(jsonBackup, null, 2), "utf-8");
        fs.writeFileSync(path.join(DATA_DIR, `codegenz_backup_${backupDate}.json`), JSON.stringify(jsonBackup, null, 2), "utf-8");
      }

      if (xmlBackup) {
        fs.writeFileSync(path.join(DATA_DIR, "codegenz_latest.xml"), xmlBackup, "utf-8");
        fs.writeFileSync(path.join(DATA_DIR, `codegenz_backup_${backupDate}.xml`), xmlBackup, "utf-8");
      }

      res.json({
        success: true,
        message: "Dữ liệu đã được lưu trữ an toàn lâu dài trên máy chủ và xuất file XML/JSON thành công.",
        savedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Save backup error:", err);
      res.status(500).json({ success: false, error: err.message || "Không thể lưu tệp dữ liệu máy chủ" });
    }
  });

  // Load latest backup from server disk
  app.get("/api/data/load-backup", (_req, res) => {
    try {
      const latestJsonPath = path.join(DATA_DIR, "codegenz_latest.json");
      const latestXmlPath = path.join(DATA_DIR, "codegenz_latest.xml");

      if (fs.existsSync(latestJsonPath)) {
        const raw = fs.readFileSync(latestJsonPath, "utf-8");
        const json = JSON.parse(raw);
        return res.json({ success: true, hasBackup: true, data: json, source: "server_json" });
      }

      if (fs.existsSync(latestXmlPath)) {
        const xml = fs.readFileSync(latestXmlPath, "utf-8");
        return res.json({ success: true, hasBackup: true, xml, source: "server_xml" });
      }

      res.json({ success: true, hasBackup: false, message: "Chưa có bản sao lưu nào trên máy chủ." });
    } catch (err: any) {
      console.error("Load backup error:", err);
      res.status(500).json({ success: false, error: err.message || "Lỗi đọc sao lưu máy chủ" });
    }
  });

  // Direct XML download stream
  app.get("/api/data/download-xml", (_req, res) => {
    try {
      const latestXmlPath = path.join(DATA_DIR, "codegenz_latest.xml");
      if (fs.existsSync(latestXmlPath)) {
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", `attachment; filename="codegenz_database_${new Date().toISOString().slice(0,10)}.xml"`);
        return res.sendFile(latestXmlPath);
      }
      res.status(404).send("Chưa có tệp XML sao lưu.");
    } catch (err: any) {
      res.status(500).send("Lỗi tải tệp XML");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CODE GenZ Family Server running on port ${PORT} with SQLite Database`);
  });
}

startServer();
