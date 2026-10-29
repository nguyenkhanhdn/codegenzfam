import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmotionJournalEntry } from '../../types';
import { aiService, ParentCoachAnalysis } from '../../services/aiService';
import {
  Sparkles,
  Heart,
  BookOpen,
  CalendarCheck2,
  HeartHandshake,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  Send,
} from 'lucide-react';

import { FamilyGroupWidget } from '../family/FamilyGroupWidget';

interface ParentDashboardProps {
  onOpenDeepTalk: () => void;
  onOpenChallenge: () => void;
  onOpenAIChat: () => void;
  onOpenFamilyManagement?: (tab?: 'overview' | 'invite' | 'invitations' | 'all_families') => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  onOpenDeepTalk,
  onOpenChallenge,
  onOpenAIChat,
  onOpenFamilyManagement = () => {},
}) => {
  const {
    currentUser,
    family,
    getFilteredJournalsForUser,
    challengeTasks,
    challengeProgress,
    confirmChallengeTask,
    addParentReaction,
    setActiveTab,
  } = useApp();

  const sharedJournals = getFilteredJournalsForUser(currentUser);
  const currentDay = 9;
  const todayTask = challengeTasks.find((t) => t.day === currentDay) || challengeTasks[0];
  const todayProgress = challengeProgress.find((p) => p.day === todayTask?.day);

  // AI Parent Coach state
  const [selectedJournalForCoach, setSelectedJournalForCoach] = useState<EmotionJournalEntry | null>(
    sharedJournals[0] || null
  );
  const [coachAnalysis, setCoachAnalysis] = useState<ParentCoachAnalysis | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [customComment, setCustomComment] = useState('');

  const handleAnalyzeWithAI = async (journal: EmotionJournalEntry) => {
    setSelectedJournalForCoach(journal);
    setLoadingCoach(true);
    try {
      const result = await aiService.getParentCoaching({
        emotion: journal.emotionLabel,
        intensity: journal.intensity,
        reason: journal.reason,
        wishToUnderstand: journal.wishToUnderstand || '',
        studentName: journal.studentName,
      });
      setCoachAnalysis(result);
    } catch {
      setCoachAnalysis({
        empathyAnalysis: `Con đang cảm thấy ${journal.emotionLabel} (mức độ ${journal.intensity}/10). Điều con khao khát nhất là được cha mẹ thấu hiểu và tin tưởng mà không vội phán xét.`,
        suggestedMessages: [
          `"Mẹ đã đọc nhật ký của con rồi. Cảm ơn con gái đã tin tưởng mở lòng với mẹ. Mẹ luôn ở đây đồng hành cùng con."`,
          `"Bố hiểu con đang rất nỗ lực. Dù kết quả thế nào bố mẹ cũng luôn tự hào về sự kiên trì của con."`,
        ],
        thingsToAvoid: [
          'Tránh nói: "Có mỗi việc học mà cũng kêu stress", "Ngày xưa bố mẹ còn khổ hơn nhiều".',
          'Tránh so sánh con với con nhà người ta.',
        ],
        actionTip: 'Hãy chuẩn bị một món ăn nhẹ hoặc đồ uống con thích và dành cho con một cái ôm ấm áp.',
      });
    } finally {
      setLoadingCoach(false);
    }
  };

  const handleSendReaction = (journalId: string, type: 'heart' | 'hug' | 'proud' | 'listen', messageText?: string) => {
    const textToSend = messageText || customComment;
    addParentReaction(journalId, type, textToSend);
    setCustomComment('');
  };

  return (
    <div className="space-y-8">
      {/* Top Banner for Parents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-[#1E1B4B] via-[#4C1D95] to-[#BE185D] rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-purple-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="max-w-xl">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-pink-100 border border-white/20">
                Góc cha mẹ thấu cảm
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
                Đồng hành cùng con ở lứa tuổi THPT 🌸
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 mt-2 font-normal leading-relaxed">
                Lắng nghe trọn vẹn, không phán xét. Con đã tin tưởng mở lòng chia sẻ <strong>{sharedJournals.length} nhật ký cảm xúc</strong> với cha mẹ.
              </p>
            </div>
            <span className="text-4xl hidden sm:block opacity-90 drop-shadow-sm">🏡</span>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('journal')}
              className="px-5 py-3 bg-white hover:bg-slate-50 active:scale-95 text-purple-950 font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-purple-700" />
              Đọc nhật ký con chia sẻ ({sharedJournals.length})
            </button>
            <button
              onClick={onOpenAIChat}
              className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider rounded-full backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Tư vấn cùng trợ lý AI CODE
            </button>
          </div>
        </div>

        {/* Happiness Metric */}
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
              <span className="text-slate-600 font-medium">Cấp 2: Nhịp cầu yêu thương</span>
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
        {/* Left Column (2 Cols): Shared Journal Stream & AI Parent Coach */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Parent Coach Card */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    AI Parent Coach – Hướng dẫn đồng cảm & phản hồi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân tích tâm lý từ nhật ký của con để gợi ý cha mẹ cách mở lời khéo léo nhất
                  </p>
                </div>
              </div>
            </div>

            {/* Select Journal to analyze */}
            {sharedJournals.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-100">
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Đang phân tích nhật ký: {selectedJournalForCoach?.emotionLabel} ({selectedJournalForCoach?.intensity}/10)
                    </span>
                    <span className="text-slate-600 line-clamp-1 italic mt-0.5">
                      "{selectedJournalForCoach?.reason}"
                    </span>
                  </div>
                  <button
                    onClick={() => selectedJournalForCoach && handleAnalyzeWithAI(selectedJournalForCoach)}
                    disabled={loadingCoach}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    {loadingCoach ? 'Đang phân tích...' : 'AI Phân tích phản hồi'}
                  </button>
                </div>

                {/* AI Analysis Results */}
                {coachAnalysis && (
                  <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4 text-xs">
                    {/* 1. Empathy Analysis */}
                    <div>
                      <span className="font-bold text-indigo-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider mb-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                        Góc nhìn tâm lý của con:
                      </span>
                      <p className="text-slate-800 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 leading-relaxed">
                        {coachAnalysis.empathyAnalysis}
                      </p>
                    </div>

                    {/* 2. Suggested Messages */}
                    <div>
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider mb-1.5">
                        <Heart className="w-3.5 h-3.5 text-emerald-600" />
                        Gợi ý 3 câu nói chạm đến trái tim con:
                      </span>
                      <div className="space-y-2">
                        {coachAnalysis.suggestedMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-slate-800 flex items-start justify-between gap-2"
                          >
                            <span className="italic">{msg}</span>
                            <button
                              onClick={() => {
                                if (selectedJournalForCoach) {
                                  handleSendReaction(selectedJournalForCoach.id, 'heart', msg);
                                  alert('Đã gửi phản hồi yêu thương này tới con!');
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 shrink-0 not-italic transition-colors"
                            >
                              Gửi câu này
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Things to Avoid */}
                    <div>
                      <span className="font-bold text-rose-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Những điều cha mẹ nên tránh:
                      </span>
                      <ul className="space-y-1.5 bg-rose-50/60 p-3.5 rounded-xl border border-rose-100 text-rose-800">
                        {coachAnalysis.thingsToAvoid.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="font-bold">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 4. Action tip */}
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium flex items-center gap-2">
                      <span>💡</span>
                      <span><strong>Hành động gợi ý:</strong> {coachAnalysis.actionTip}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 italic">
                Chưa có nhật ký nào được chia sẻ từ con. Khi con chia sẻ, AI sẽ tự động phân tích và hỗ trợ cha mẹ tại đây.
              </div>
            )}
          </div>

          {/* Today's 30-Day Challenge for Parent */}
          {todayTask ? (
          <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Thử Thách 30 Ngày Kết Nối (Ngày {todayTask.day}/30)
                  </h3>
                  <p className="text-xs text-slate-500">
                    +{todayTask.points} Happiness Points khi cả con và cha mẹ cùng hoàn thành
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenChallenge}
                className="text-xs font-bold uppercase tracking-wider text-purple-700 hover:text-pink-600 transition-colors flex items-center gap-1"
              >
                Xem 30 ngày <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-5 rounded-2xl border border-purple-100">
              <div className="flex items-start gap-4">
                <span className="text-3xl drop-shadow-xs">{todayTask.icon}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">{todayTask.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{todayTask.description}</p>

                  {/* Parent Action */}
                  <div className="mt-3.5 bg-white p-3.5 rounded-xl border border-purple-100 text-xs shadow-xs">
                    <span className="font-bold text-purple-900 block mb-1">
                      👉 Nhiệm vụ của Cha Mẹ:
                    </span>
                    <p className="text-slate-600">{todayTask.parentAction}</p>
                  </div>

                  {/* Confirmation */}
                  <div className="mt-4 pt-3.5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`font-bold ${todayProgress?.parentConfirmed ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {todayProgress?.parentConfirmed ? '✓ Bạn đã hoàn thành' : '○ Bạn chưa xác nhận'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={`font-bold ${todayProgress?.studentConfirmed ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {todayProgress?.studentConfirmed ? '✓ Con đã hoàn thành' : '○ Chờ con xác nhận'}
                      </span>
                    </div>

                    {!todayProgress?.parentConfirmed ? (
                      <button
                        onClick={() => confirmChallengeTask(todayTask.day, 'parent')}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Xác nhận cha mẹ đã hoàn thành
                      </button>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        ✓ Cha mẹ đã hoàn tất
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

        </div>

        {/* Right Column: Deep Talk & Guidance */}
        <div className="space-y-6">
          {/* Deep Talk Card */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="text-base font-extrabold text-slate-900">Deep Talk Cùng Con</h3>
              </div>
              <button
                onClick={onOpenDeepTalk}
                className="text-xs font-bold uppercase tracking-wider text-purple-700 hover:text-pink-600"
              >
                Khám phá
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Các bộ câu hỏi được thiết kế bởi chuyên gia tâm lý học đường, giúp mở khóa những điều con chưa từng kể.
            </p>

            <button
              onClick={onOpenDeepTalk}
              className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 font-extrabold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 border border-purple-200"
            >
              <HeartHandshake className="w-4 h-4" />
              Chọn chủ đề Deep Talk
            </button>
          </div>

          {/* CODE Parent Principle */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-pink-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-widest">NGUYÊN TẮC ĐỒNG HÀNH CODE</span>
            </div>
            <h4 className="text-base font-extrabold text-white">
              3 KHÔNG khi con chia sẻ áp lực
            </h4>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-pink-400 font-bold">1.</span>
                <span><strong>Không gạt bỏ:</strong> Tránh nói "Chuyện có gì đâu mà phải lo".</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400 font-bold">2.</span>
                <span><strong>Không phán xét:</strong> Tránh trách cứ ngay khi con vừa tâm sự.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400 font-bold">3.</span>
                <span><strong>Không đưa giải pháp vội vàng:</strong> Hãy lắng nghe trọn vẹn trước khi cho lời khuyên.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
