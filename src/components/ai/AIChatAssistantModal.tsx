import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { aiService, AIChatMessage } from '../../services/aiService';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  Lightbulb,
  Heart,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { CodeGenzMascot } from '../Logo';

interface AIChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatAssistantModal: React.FC<AIChatAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useApp();

  const isStudent = currentUser.role === 'student';
  const roleType = isStudent ? 'student' : 'parent';

  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: isStudent
        ? `Chào ${currentUser.name}! Mình là Trợ lý AI CODE GenZ. Bạn đang gặp phải chuyện gì áp lực ở trường lớp hay cần bí kíp mở lời với bố mẹ? Cứ tâm sự với mình nhé!`
        : `Kính chào ${currentUser.familyRole === 'father' ? 'Bố ' : 'Mẹ '}${currentUser.name}! Em là Trợ lý AI CODE GenZ, sẵn sàng đồng hành cùng cha mẹ trong việc thấu hiểu tâm lý lứa tuổi THPT, giải tỏa xung đột và xây dựng cuộc trò chuyện chân thành cùng con.`,
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const quickPrompts = isStudent
    ? [
        'Làm sao để nói với bố mẹ rằng con không muốn học ngành bố mẹ chọn?',
        'Con bị điểm kém bài kiểm tra 1 tiết, làm sao để bố mẹ bớt la mắng?',
        'Con cảm thấy rất áp lực trước kỳ thi đại học, làm sao để giữ bình tĩnh?',
        'Bố mẹ không cho con dùng điện thoại nhiều, con nên thương lượng thế nào?',
      ]
    : [
        'Con gái dạo này hay đóng cửa phòng và ít nói chuyện, tôi nên bắt đầu thế nào?',
        'Con bị điểm kém môn Toán, làm sao để động viên mà không gây áp lực?',
        'Làm thế nào để lắng nghe con mà không vội vàng phán xét hay so sánh?',
        'Cách phản hồi nhật ký của con một cách tinh tế và ấm áp nhất?',
      ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const newMsgs: AIChatMessage[] = [...messages, { role: 'user', content: query }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const reply = await aiService.sendMessage({
        message: query,
        role: roleType,
        context: isStudent
          ? `Học sinh lớp 11 tên ${currentUser.name}, đang chịu nhiều kỳ vọng thi cử.`
          : `Phụ huynh của học sinh lớp 11, muốn học cách thấu hiểu tâm lý Gen Z.`,
        history: newMsgs.slice(-6),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Kết nối AI bị gián đoạn. Vui lòng thử lại.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 flex flex-col h-[640px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <CodeGenzMascot size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">Trợ Lý AI CODE GenZ</h2>
                <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full shadow-xs">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                {isStudent ? 'Đồng hành cảm xúc & Kỹ năng chia sẻ cho Học sinh' : 'Cố vấn thấu cảm & Gợi ý giao tiếp cho Cha Mẹ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Bar */}
        <div className="bg-[#0F172A] text-slate-300 py-1.5 px-5 text-[10px] uppercase tracking-wider flex items-center justify-between shrink-0 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI hỗ trợ kỹ năng giao tiếp • Bảo mật tuyệt đối • Không thay thế chuyên gia y tế</span>
          </div>
        </div>

        {/* Chat Messages Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50">
          {messages.map((msg, index) => {
            const isAI = msg.role === 'assistant';
            return (
              <div
                key={index}
                className={`flex items-start gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    isAI
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                      : 'bg-gradient-to-br from-pink-500 to-rose-600 text-white'
                  }`}
                >
                  {isAI ? <CodeGenzMascot size={24} /> : <UserIcon className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                    isAI
                      ? 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs whitespace-pre-line'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md rounded-tr-xs'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold p-2">
              <Sparkles className="w-4 h-4 animate-spin text-pink-500" />
              <span>AI CODE đang suy nghĩ câu trả lời thấu cảm nhất...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-white border-t border-slate-200 overflow-x-auto flex items-center gap-2 shrink-0 no-scrollbar">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap pl-1">
            Gợi ý:
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 rounded-full text-xs bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 whitespace-nowrap border border-slate-200 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-white border-t border-slate-200 flex gap-2.5 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isStudent
                ? 'Nhập tâm sự hoặc câu hỏi về cách nói chuyện với bố mẹ...'
                : 'Nhập câu hỏi về tâm lý con hoặc cách ứng xử...'
            }
            className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-slate-800 bg-slate-50 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 disabled:opacity-50 active:scale-95 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};

