# CODE GenZ Family

## Chạy ứng dụng và kích hoạt trợ lý AI

1. Cài Node.js 22+, chạy `npm install`.
2. Mở https://aistudio.google.com/apikey bằng tài khoản Google của bạn và chọn **Create API key** trong dự án của bạn. Kiểm tra quota và billing của dự án nếu có yêu cầu.
3. Sao chép `.env.example` thành `.env`, điền `GEMINI_API_KEY` trên máy chủ. Khi triển khai, đặt biến này trong phần Secrets/Environment của dịch vụ hosting. Không commit khóa, không đặt trong biến `VITE_*` và không gửi khóa qua chat.
4. Có thể đổi `GEMINI_MODEL` thành model Gemini có quyền sử dụng trong dự án; mặc định là `gemini-3.7-flash`.
5. Chạy `npm run dev`. Với production: `npm run build`, sau đó `NODE_ENV=production npm start`. Hosting cần chạy máy chủ Node/Express; chỉ phục vụ thư mục `dist` tĩnh sẽ không có API.
6. Chạy `node scripts/check-ai.mjs` để kiểm tra một yêu cầu AI thực tế (sử dụng quota API). Với máy chủ khác: `APP_URL=https://your-app.example node scripts/check-ai.mjs`.

`GET /api/ai/status` chỉ cho biết đã đặt khóa hay chưa, không xác minh khóa/quota/model. Khi thiếu khóa, API AI trả HTTP 503. Trợ lý chat hiển thị lỗi thay vì giả lập câu trả lời AI. Các gợi ý dự phòng cục bộ cho parent coaching và icebreakers vẫn được giữ.

Nếu API trả lỗi: kiểm tra khóa và quyền truy cập model, quota/billing, kết nối mạng máy chủ tới Gemini; sau khi đổi biến môi trường cần khởi động lại/redeploy. Khóa chỉ được đọc ở máy chủ.

## Vercel

`vercel.json` builds the Vite frontend only. `api/ai/[action].ts` serves chat, parent-coach, icebreakers and status as a Node.js Function using shared handlers from `server/aiRoutes.ts`. This function never initializes SQLite or writes to local disk. The rest of the existing local Express/SQLite API is not deployed by this AI integration.

Set `GEMINI_API_KEY` in Vercel project Environment Variables for Production and Preview, then redeploy. `GEMINI_MODEL` is optional. Test the preview with `node scripts/check-ai.mjs` and `APP_URL` before release. Protected previews require Vercel authentication.

### AI Gateway authentication on Vercel

When `GEMINI_API_KEY` is empty, the shared AI handler uses Vercel AI Gateway with the deployment's automatically rotated `VERCEL_OIDC_TOKEN` (or `AI_GATEWAY_API_KEY` outside Vercel). It defaults to `google/gemini-3.8-flash`; override with `AI_GATEWAY_MODEL`. Requests consume the team's AI Gateway credits. Account verification or credit setup may still be required in Vercel. Never copy an OIDC token into source or a permanent environment variable. A nonempty Gemini key keeps direct Gemini as the preferred provider.
