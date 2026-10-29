import type { Express } from "express";
import { GoogleGenAI } from "@google/genai";

type GenerationParams = {
  model: string;
  contents: string;
  config?: { systemInstruction?: string; temperature?: number; responseMimeType?: string };
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45000 } });
    return { generate: async (params: GenerationParams) => client.models.generateContent(params) };
  }
  // Resolve per request: Vercel rotates OIDC credentials automatically.
  const token = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN;
  if (!token) return null;
  return {
    async generate(params: GenerationParams): Promise<{ text: string }> {
      const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model: process.env.AI_GATEWAY_MODEL?.trim() || 'google/gemini-3.8-flash',
          messages: [
            ...(params.config?.systemInstruction ? [{ role: 'system', content: params.config.systemInstruction }] : []),
            { role: 'user', content: params.contents },
          ],
          max_tokens: 2500,
          ...(params.config?.temperature !== undefined ? { temperature: params.config.temperature } : {}),
          ...(params.config?.responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        // Never log raw provider payloads or authorization credentials.
        throw Object.assign(new Error('AI Gateway request failed'), { status: response.status, code: data?.error?.code });
      }
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('Empty AI Gateway response');
      return { text };
    },
  };
}

export function registerAiRoutes(app: Express) {
  // Reports configuration only; never exposes credentials or claims provider readiness.
  app.get("/api/ai/status", (_req, res) => {
    res.json({
      configured: Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN),
      provider: process.env.GEMINI_API_KEY?.trim() ? 'gemini' : 'vercel-ai-gateway',
    });
  });

  // AI Chat Assistant endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, role, context, history } = req.body;
      if (typeof message !== "string" || !message.trim() || message.length > 10000 || !["student", "parent"].includes(role)) {
        return res.status(400).json({ error: "Vui lòng nhập tin nhắn hợp lệ (tối đa 10.000 ký tự)." });
      }
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({ code: "AI_NOT_CONFIGURED", error: "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên để kích hoạt." });
      }

      const systemInstruction = role === "parent"
        ? `Bạn là CODE Empathy Assistant - Chuyên gia trợ lý tâm lý giao tiếp dành cho CHA MẸ có con đang học THPT (GenZ).
Mục tiêu cốt lõi:
1. Giúp cha mẹ thấu hiểu tâm sinh lý lứa tuổi học sinh THPT (áp lực thi cử, định hướng tương lai, tình bạn, mong muốn khẳng định bản thân).
2. Hướng dẫn cha mẹ cách phản hồi không phán xét, không áp đặt, không so sánh "con nhà người ta".
3. Gợi ý cụ thể câu từ, lời nói ấm áp, tạo cảm giác an toàn để con sẵn sàng mở lòng.
4. Tôn trọng triết lý CODE: Connect (Kết nối) - Open (Mở lòng) - Develop (Phát triển) - Empathy (Đồng cảm).
Lưu ý: Luôn dùng giọng điệu ân cần, tôn trọng, mang tính xây dựng, ngắn gọn và dễ áp dụng vào thực tế gia đình Việt Nam.`
        : `Bạn là CODE GenZ Companion - Trợ lý giao tiếp thân thiện, tinh tế dành cho HỌC SINH THPT.
Mục tiêu cốt lõi:
1. Giúp học sinh diễn đạt cảm xúc một cách rõ ràng khi đang bối rối, lo âu hoặc áp lực.
2. Gợi ý các cách mở đầu cuộc trò chuyện tự nhiên với cha mẹ mà không sợ bị la mắng hay hiểu lầm.
3. Giúp học sinh nhìn nhận góc nhìn yêu thương của cha mẹ dù đôi khi cách thể hiện của cha mẹ chưa khéo.
4. Đề xuất các câu hỏi Deep Talk hoặc hành động nhỏ để gắn kết.
Lưu ý: Giọng điệu ấm áp, đồng cảm, văn phong GenZ nhẹ nhàng, văn minh, không phán xét.`;

      const prompt = `
Bối cảnh người dùng: ${context || "Giao tiếp trong gia đình THPT"}
Lịch sử trao đổi trước đó: ${JSON.stringify(history || [])}
Tin nhắn từ người dùng (${role === "parent" ? "Cha Mẹ" : "Học sinh"}): "${message}"

Hãy đưa ra câu trả lời thấu cảm, thực tế và mang lại lời khuyên hoặc gợi ý câu nói trực tiếp để người dùng có thể áp dụng ngay.`;

      const response = await ai.generate({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text?.trim();
      if (!reply) throw new Error("Empty AI response");
      res.json({ reply });
    } catch (error: any) {
      console.error("AI Chat request failed", { status: error?.status, code: error?.code });
      res.status(502).json({ error: "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại hoặc liên hệ quản trị viên." });
    }
  });

  // AI Parent Coaching endpoint (analyze student's emotion entry & suggest responses)
  app.post("/api/ai/parent-coach", async (req, res) => {
    try {
      const { emotion, intensity, reason, wishToUnderstand, studentName } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({ code: "AI_NOT_CONFIGURED", error: "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên để kích hoạt." });
      }

      const prompt = `
Phân tích nhật ký cảm xúc mà học sinh (${studentName || "Con"}) vừa chia sẻ với cha mẹ:
- Cảm xúc: ${emotion}
- Mức độ cảm xúc: ${intensity}/10
- Sự việc / Lý do: ${reason}
- Điều con mong muốn được cha mẹ hiểu: ${wishToUnderstand}

Hãy đóng vai trò chuyên gia tâm lý gia đình CODE GenZ Family và đưa ra phân tích & hướng dẫn chi tiết cho Cha Mẹ theo định dạng JSON với cấu trúc:
{
  "empathyAnalysis": "Đoạn văn ngắn gọn giải thích tâm trạng và nhu cầu tâm lý cốt lõi của con lúc này",
  "suggestedMessages": ["Gợi ý câu nói 1 ấm áp", "Gợi ý câu nói 2 khích lệ", "Gợi ý câu nói 3 mở đầu lắng nghe"],
  "thingsToAvoid": ["Điều cần tránh 1", "Điều cần tránh 2", "Điều cần tránh 3"],
  "actionTip": "Hành động thực tế nhỏ mà cha mẹ có thể làm ngay hôm nay để kết nối với con"
}
`;

      const response = await ai.generate({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: "Bạn là chuyên gia tư vấn tâm lý học hành vi gia đình Việt Nam. Luôn xuất ra JSON hợp lệ.",
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Parent coach request failed", { status: error?.status });
      res.status(502).json({ error: "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại hoặc liên hệ quản trị viên." });
    }
  });

  // AI Icebreaker generator for student
  app.post("/api/ai/icebreakers", async (req, res) => {
    try {
      const { topic, difficulty } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({ code: "AI_NOT_CONFIGURED", error: "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên để kích hoạt." });
      }

      const prompt = `Học sinh THPT muốn nói chuyện với bố mẹ về chủ đề: "${topic || 'áp lực học tập và chọn ngành'}".
Mức độ khó mở lời: ${difficulty || 'vừa phải'}.
Hãy tạo 3 câu mở đầu (icebreakers) tự nhiên, chân thành, giúp phụ huynh không bị giật mình hay phản ứng phòng thủ, mà tạo ra bầu không khí cởi mở và ấm áp.
Trả về JSON định dạng: { "icebreakers": ["câu 1", "câu 2", "câu 3"] }`;

      const response = await ai.generate({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Icebreaker request failed", { status: error?.status });
      res.status(502).json({ error: "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại hoặc liên hệ quản trị viên." });
    }
  });

}
