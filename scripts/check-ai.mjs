// Run against the running application. Credentials stay on the server.
const base = process.env.APP_URL || 'http://localhost:3000';
try {
  const response = await fetch(new URL('/api/ai/chat', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Chào bạn, hãy trả lời một câu ngắn bằng tiếng Việt.', role: 'student', history: [] }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  console.log('AI check passed: server received a Gemini response.');
} catch (error) {
  console.error('AI check failed:', error.message);
  process.exitCode = 1;
}
