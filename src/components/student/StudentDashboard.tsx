import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  BookOpen,
  Stethoscope,
  HeartHandshake,
  CalendarCheck2,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import { FamilyGroupWidget } from '../family/FamilyGroupWidget';

interface StudentDashboardProps {
  onOpenNewJournal: () => void;
  onOpenNewConsultation: () => void;
  onOpenDeepTalk: () => void;
  onOpenChallenge: () => void;
  onOpenAIChat: () => void;
  onOpenFamilyManagement?: (tab?: 'overview' | 'invite' | 'invitations' | 'all_families') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenNewJournal,
  onOpenNewConsultation,
  onOpenDeepTalk,
  onOpenChallenge,
  onOpenAIChat,
  onOpenFamilyManagement = () => {},
}) => {
  const {
    currentUser,
    family,
    journalEntries,
    consultations,
    challengeTasks,
    challengeProgress,
    deepTalkTopics,
    confirmChallengeTask,
    setActiveTab,
    isAuthenticated,
    openAuthModal,
  } = useApp();

  const myJournals = isAuthenticated ? journalEntries.filter((j) => j.studentId === currentUser.id) : [];
  const myConsultations = isAuthenticated ? consultations.filter((c) => c.studentId === currentUser.id) : [];

  // Active challenge is day 9 (or latest in progress)
  const currentDay = 9;
  const todayTask = challengeTasks.find((t) => t.day === currentDay) || challengeTasks[0];
  const todayProgress = challengeProgress.find((p) => p.day === todayTask?.day);

  // Quick Icebreaker Generator state
  const [icebreakerTopic, setIcebreakerTopic] = useState('áp lực điểm số và kỳ thi sắp tới');
  const [generatedIcebreakers, setGeneratedIcebreakers] = useState<string[]>([]);
  const [loadingIcebreaker, setLoadingIcebreaker] = useState(false);

  const handleGenerateIcebreaker = async () => {
    setLoadingIcebreaker(true);
    try {
      const results = await aiService.getIcebreakers(icebreakerTopic);
      setGeneratedIcebreakers(results);
    } catch {
      setGeneratedIcebreakers([
        '"Bố mẹ ơi, tối nay bố mẹ có rảnh 10 phút không ạ? Con đang gặp chút áp lực về việc học và muốn tâm sự cùng bố mẹ..."',
      ]);
    } finally {
      setLoadingIcebreaker(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-50 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-200">Chờ tiếp nhận</span>;
      case 'in_progress':
        return <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-200">Đang tham vấn</span>;
      case 'awaiting_student':
        return <span className="bg-purple-50 text-purple-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-purple-200">Chờ phản hồi</span>;
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200">Đã hoàn thành</span>;
      case 'needs_followup':
        return <span className="bg-pink-50 text-pink-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-pink-200">Cần hỗ trợ thêm</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Quick Mood Check-in & Happiness Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Today's Emotion Action */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#DB2777] rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-purple-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="max-w-xl">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-pink-100 border border-white/20">
                Nhật ký cảm xúc hôm nay
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
                {isAuthenticated
                  ? `Hôm nay bạn cảm thấy thế nào, ${currentUser.name.split(' ').pop()}? ✨`
                  : 'Hôm nay bạn cảm thấy thế nào? ✨'}
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 mt-2 font-normal leading-relaxed">
                {isAuthenticated
                  ? 'Dành 2 phút ghi lại cảm xúc để giải tỏa tâm trí. Bạn toàn quyền quyết định: Chỉ lưu riêng tư, chia sẻ cho Cha mẹ, hay gửi Chuyên gia tư vấn.'
                  : 'Đăng nhập tài khoản để bắt đầu ghi nhật ký cảm xúc cá nhân, theo dõi sức khỏe tâm lý và kết nối thấu cảm cùng gia đình.'}
              </p>
            </div>
            <span className="text-4xl hidden sm:block opacity-90 drop-shadow-sm">💖</span>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-5 py-3 bg-white hover:bg-slate-50 active:scale-95 text-purple-900 font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  Đăng nhập để ghi nhật ký
                </button>
                <button
                  onClick={onOpenAIChat}
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider rounded-full backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Tư vấn cùng AI CODE
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onOpenNewJournal}
                  className="px-5 py-3 bg-white hover:bg-slate-50 active:scale-95 text-purple-900 font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-purple-700" />
                  Ghi nhật ký cảm xúc ngay
                </button>
                <button
                  onClick={() => setActiveTab('journal')}
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider rounded-full backdrop-blur-md border border-white/20 transition-all"
                >
                  Xem nhật ký đã lưu ({myJournals.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Family Happiness Metric */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Điểm hạnh phúc gia đình
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900">{family.happinessPoints}</span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Points</span>
            </div>
            <p className="text-xs text-amber-700 font-bold mt-2 flex items-center gap-1.5 bg-amber-50/80 px-3 py-1 rounded-full border border-amber-200/60 w-fit">
              <span>🔥 Chuỗi {family.streakDays} ngày kết nối liên tục!</span>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-600 font-medium">Cấp độ: Nhịp cầu yêu thương</span>
              <span className="font-bold text-purple-700">480/500</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 rounded-full" style={{ width: '96%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Family Group & Members Widget */}
      <FamilyGroupWidget onOpenFamilyModal={onOpenFamilyManagement} />

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Consultations & Today's Challenge */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Consultation Widget */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Tham vấn chuyên gia tâm lý ({myConsultations.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kênh tham vấn chuyên môn, bảo mật tuyệt đối và định hướng khoa học
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenNewConsultation}
                className="text-xs font-bold uppercase tracking-wider text-purple-700 hover:text-pink-600 transition-colors flex items-center gap-1"
              >
                + Phiên mới
              </button>
            </div>

            {myConsultations.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 italic">
                Bạn chưa có phiên tham vấn nào. Nếu gặp áp lực học đường, bạn có thể chủ động gửi yêu cầu bất cứ lúc nào.
              </div>
            ) : (
              <div className="space-y-3">
                {myConsultations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveTab('consultation')}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {c.topic}
                        </h4>
                        <p className="text-xs text-purple-700 font-medium mt-0.5">
                          Chuyên gia: <strong>{c.psychologistName || 'Đang phân công'}</strong> • {c.psychologistTitle}
                        </p>
                      </div>
                      {getStatusBadge(c.status)}
                    </div>

                    {c.messages.length > 0 && (
                      <div className="mt-3 bg-slate-50 p-3 rounded-xl text-xs text-slate-600 flex items-start gap-2 border border-slate-100">
                        <MessageCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <p className="line-clamp-1 italic text-slate-800">
                          "{c.messages[c.messages.length - 1].content}"
                        </p>
                      </div>
                    )}

                    {c.nextActionPlan && (
                      <div className="mt-2.5 p-2.5 bg-indigo-50 rounded-xl text-xs text-indigo-800 flex items-center gap-2 font-medium border border-indigo-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kế hoạch hành động: Xem chi tiết hướng dẫn của chuyên gia</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's 30-Day Challenge Card */}
          {todayTask ? (
          <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Thử thách 30 ngày kết nối (Ngày {todayTask.day}/30)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Giai đoạn 2: {todayTask.stageName} • +{todayTask.points} Happiness Points
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenChallenge}
                className="text-xs font-bold uppercase tracking-wider text-purple-700 hover:text-pink-600 transition-colors flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-5 rounded-2xl border border-purple-100">
              <div className="flex items-start gap-4">
                <span className="text-3xl drop-shadow-xs">{todayTask.icon}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">{todayTask.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{todayTask.description}</p>

                  {/* Student Action Prompt */}
                  <div className="mt-3.5 bg-white p-3.5 rounded-xl border border-purple-100 text-xs shadow-xs">
                    <span className="font-bold text-purple-900 block mb-1">
                      👉 Nhiệm vụ của bạn (Học sinh):
                    </span>
                    <p className="text-slate-600">{todayTask.studentAction}</p>
                  </div>

                  {/* Status & Confirmation Checklist */}
                  <div className="mt-4 pt-3.5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`flex items-center gap-1 font-bold ${todayProgress?.studentConfirmed ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {todayProgress?.studentConfirmed ? '✓ Bạn đã hoàn thành' : '○ Bạn chưa xác nhận'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={`flex items-center gap-1 font-bold ${todayProgress?.parentConfirmed ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {todayProgress?.parentConfirmed ? '✓ Cha mẹ đã hoàn thành' : '○ Chờ Cha mẹ xác nhận'}
                      </span>
                    </div>

                    {!todayProgress?.studentConfirmed ? (
                      <button
                        onClick={() => confirmChallengeTask(todayTask.day, 'student')}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đánh dấu đã hoàn thành
                      </button>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        ✓ Đã hoàn tất phần của bạn
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <section className="rounded-3xl border border-purple-100 bg-white p-6">
              <h3 className="font-bold text-slate-900">Thử thách 30 ngày kết nối</h3>
              <p className="mt-2 text-sm text-slate-600">Chưa có thử thách được thiết lập.</p>
            </section>
          )}

          {/* AI Icebreaker Generator Widget */}
          <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                AI Gợi Ý Mở Đầu Trò Chuyện Với Bố Mẹ (Icebreaker)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Khó mở lời? Hãy để AI CODE gợi ý câu nói tự nhiên, chân thành giúp bố mẹ thấu hiểu mà không lo bị phán xét.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
              <input
                type="text"
                value={icebreakerTopic}
                onChange={(e) => setIcebreakerTopic(e.target.value)}
                placeholder="Nhập vấn đề muốn chia sẻ (vd: áp lực chọn ngành, xin đi chơi xa, điểm số...)"
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-purple-500"
              />
              <button
                onClick={handleGenerateIcebreaker}
                disabled={loadingIcebreaker}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {loadingIcebreaker ? 'Đang tạo câu...' : 'Gợi ý câu nói'}
              </button>
            </div>

            {/* Generated Icebreaker Suggestions */}
            {generatedIcebreakers.length > 0 && (
              <div className="space-y-2 mt-4 pt-3.5 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-widest">
                  Gợi ý từ trợ lý AI:
                </span>
                {generatedIcebreakers.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs text-slate-800 italic flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <span>{msg}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg);
                        alert('Đã sao chép câu mở đầu!');
                      }}
                      className="text-[10px] uppercase tracking-wider text-purple-700 hover:text-pink-600 font-bold shrink-0 not-italic"
                    >
                      Sao chép
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Deep Talk & Quick Journal Feed */}
        <div className="space-y-6">
          {/* Deep Talk Card */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="text-base font-extrabold text-slate-900">Deep Talk Gia Đình</h3>
              </div>
              <button
                onClick={onOpenDeepTalk}
                className="text-xs font-bold uppercase tracking-wider text-purple-700 hover:text-pink-600"
              >
                Xem 8 chủ đề
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Những buổi trò chuyện có chủ đề giúp thắt chặt sợi dây thấu hiểu giữa bạn và bố mẹ.
            </p>

            <div className="space-y-2.5">
              {deepTalkTopics.slice(0, 3).map((topic) => (
                <div
                  key={topic.id}
                  onClick={onOpenDeepTalk}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{topic.icon}</span>
                      <h4 className="text-xs font-bold text-slate-900">{topic.title}</h4>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      +{topic.pointsAwarded} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 italic">
                    {topic.description}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenDeepTalk}
              className="w-full mt-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 border border-purple-200"
            >
              <HeartHandshake className="w-4 h-4" />
              Bắt đầu phiên Deep Talk
            </button>
          </div>

          {/* Privacy & Safety Guarantee */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-pink-300 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-widest">BẢO MẬT & QUYỀN RIÊNG TƯ</span>
            </div>
            <h4 className="text-base font-extrabold text-white">
              Bạn toàn quyền kiểm soát dữ liệu
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Nhật ký đánh dấu <strong>"Chỉ riêng tôi"</strong> không một ai khác (kể cả Cha mẹ hay Chuyên gia) có thể xem được. Dữ liệu chỉ được gửi khi bạn chủ động phân quyền.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
