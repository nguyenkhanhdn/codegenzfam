export type UserRole = 'student' | 'parent' | 'psychologist' | 'admin';

export type FamilyRole = 'student' | 'mother' | 'father' | 'guardian' | 'none';

export type UserStatus = 'active' | 'locked' | 'pending';

export interface UserPermissions {
  canCreateJournal?: boolean;
  canViewFamilyJournals?: boolean;
  canRequestConsultation?: boolean;
  canManageConsultations?: boolean;
  canManageChallenges?: boolean;
  canManageDeeptalk?: boolean;
  canManageUsers?: boolean;
  canAuditLogs?: boolean;
  canExportDatabase?: boolean;
}

export interface User {
  authUserId?: string;
  version?: number;
  mustChangePassword?: boolean;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  familyRole?: FamilyRole;
  avatar: string;
  familyId?: string;
  grade?: string; // e.g. "Lớp 11A3 - THPT Chu Văn An"
  title?: string; // e.g. "ThS. Tâm lý học lâm sàng" (dành cho chuyên gia)
  bio?: string;
  phone?: string;
  verified?: boolean;
  status?: UserStatus;
  createdAt?: string;
  lastLoginAt?: string;
  password?: string;
  permissions?: UserPermissions;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: User | null;
  token?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  familyRole?: FamilyRole;
  familyCode?: string;
  grade?: string;
  title?: string;
  bio?: string;
  phone?: string;
  avatar?: string;
}

export interface LoginPayload {
  emailOrName: string;
  password?: string;
  rememberMe?: boolean;
}

export interface Family {
  id: string;
  name: string;
  familyCode: string; // e.g. "CODE-8899"
  studentIds: string[];
  parentIds: string[];
  happinessPoints: number;
  streakDays: number;
  createdAt: string;
  avatarIcon?: string;
  description?: string;
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  familyName: string;
  familyCode: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientEmailOrPhone: string;
  targetFamilyRole: FamilyRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export type EmotionType =
  | 'happy'
  | 'peaceful'
  | 'stressed'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'lonely'
  | 'excited'
  | 'overwhelmed';

export type FamilyJournalEmotion =
  | 'happy'       // Vui vẻ & Hân hoan
  | 'grateful'    // Biết ơn & Trân trọng
  | 'proud'       // Tự hào & Hãnh diện
  | 'warm'        // Ấm áp & Gắn kết
  | 'loving'      // Yêu thương & Sẻ chia
  | 'peaceful'    // Bình yên & Thư thái
  | 'funny'       // Hài hước & Tiếng cười
  | 'nostalgic'   // Bồi hồi & Kỷ niệm
  | 'hopeful';    // Hy vọng & Động lực

export interface FamilyMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  name?: string;
  caption?: string;
  thumbnailUrl?: string;
  duration?: string; // e.g. "0:45"
}

export type FamilyReactionType = 'love' | 'hug' | 'proud' | 'cheer' | 'grateful' | 'laugh';

export interface FamilyJournalReaction {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  familyRole?: FamilyRole;
  reactionType: FamilyReactionType;
  createdAt: string;
}

export interface FamilyJournalComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  familyRole?: FamilyRole;
  content: string;
  createdAt: string;
}

export interface FamilyJournalEntry {
  id: string;
  familyId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  authorFamilyRole?: FamilyRole; // 'student' | 'mother' | 'father' | 'guardian'
  title: string;
  content: string;
  emotion: FamilyJournalEmotion;
  emotionLabel: string;
  media: FamilyMediaItem[];
  tags: string[];
  location?: string;
  isPinned?: boolean;
  reactions: FamilyJournalReaction[];
  comments: FamilyJournalComment[];
  createdAt: string;
  updatedAt?: string;
}

export type JournalPrivacy =
  | 'private'              // Chỉ lưu riêng cho bản thân
  | 'share_parent'          // Chia sẻ với cha mẹ
  | 'share_psychologist'    // Chia sẻ với chuyên gia tâm lý
  | 'share_all';            // Chia sẻ với cả cha mẹ và chuyên gia

export interface ParentReaction {
  id: string;
  parentId: string;
  parentName: string;
  parentRoleName: string; // "Mẹ Hương", "Bố Tuấn"
  reactionType: 'heart' | 'hug' | 'proud' | 'listen';
  comment?: string;
  createdAt: string;
}

export interface EmotionJournalEntry {
  id: string;
  studentId: string;
  studentName: string;
  familyId?: string;
  emotion: EmotionType;
  emotionLabel: string;
  intensity: number; // 1 -> 10
  triggers: string[]; // ["Kỳ thi sắp tới", "Bất đồng quan điểm", "Áp lực điểm số"]
  reason: string; // Điều khiến mình vui, buồn, lo lắng hoặc áp lực
  eventsHappening: string; // Những sự việc đang xảy ra
  wishToUnderstand: string; // Điều mình mong muốn được người khác hiểu
  personalNote: string; // Ghi chú cá nhân
  privacy: JournalPrivacy;
  consultationRequested: boolean;
  consultationId?: string;
  parentReactions: ParentReaction[];
  createdAt: string;
}

export type ConsultationStatus =
  | 'pending'           // Chờ tiếp nhận
  | 'in_progress'       // Đang tham vấn
  | 'awaiting_student'  // Chờ học sinh phản hồi
  | 'completed'         // Hoàn thành
  | 'needs_followup';   // Cần hỗ trợ thêm

export interface ConsultationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'psychologist';
  content: string;
  timestamp: string;
}

export interface ConsultationSession {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade?: string;
  psychologistId?: string;
  psychologistName?: string;
  psychologistTitle?: string;
  topic: string;
  initialMessage: string;
  sharedJournalIds: string[];
  sharedJournals?: EmotionJournalEntry[];
  status: ConsultationStatus;
  messages: ConsultationMessage[];
  officialFeedback?: string; // Phản hồi chuyên môn & định hướng từ chuyên gia
  nextActionPlan?: string;   // Kế hoạch hành động / bài tập tâm lý cho học sinh
  privateProfessionalNotes?: string; // Ghi chú riêng của chuyên gia (chỉ chuyên gia thấy)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DeepTalkQuestion {
  id: string;
  prompt: string;
  studentPromptHint: string;
  parentPromptHint: string;
}

export interface DeepTalkTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  pointsAwarded: number;
  questions: DeepTalkQuestion[];
}

export interface DeepTalkSession {
  id: string;
  familyId: string;
  topicId: string;
  topicTitle: string;
  currentQuestionIndex: number;
  answers: {
    questionId: string;
    studentAnswer?: string;
    parentAnswer?: string;
  }[];
  reflection?: string;
  isCompleted: boolean;
  completedAt?: string;
  startedAt: string;
}

export interface Challenge30DayTask {
  day: number;
  title: string;
  description: string;
  stage: 1 | 2 | 3 | 4;
  stageName: string;
  studentAction: string;
  parentAction: string;
  points: number;
  icon: string;
  tip: string;
}

export interface ChallengeDayProgress {
  day: number;
  studentConfirmed: boolean;
  parentConfirmed: boolean;
  isCompleted: boolean;
  completedAt?: string;
  note?: string;
}

export interface HappinessPointRecord {
  id: string;
  familyId: string;
  amount: number;
  source: 'challenge' | 'deeptalk' | 'journal_share' | 'positive_reaction' | 'streak_bonus';
  sourceTitle: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'journal' | 'consultation' | 'deeptalk' | 'challenge' | 'system' | 'reaction';
  isRead: boolean;
  createdAt: string;
  actionTab?: string;
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
  status: 'SUCCESS' | 'BLOCKED_PRIVACY' | 'FAILED' | 'ERROR';
}
