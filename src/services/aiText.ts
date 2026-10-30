/** Convert conversational Markdown to readable text without removing punctuation or [X] placeholders. */
export function formatAiText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*```[^\n]*\n?/gm, '')
    .replace(/^[ \t]{0,3}(?:>[ \t]*)+/gm, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, '')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '• ')
    .replace(/!?\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*{2,3}|(?<!\s)\*|\*(?=\S)|`{1,3}|~~/g, '')
    .replace(/(^|[ \t])_{1,2}(?=\S)(.+?)_{1,2}(?=$|\s|[.,!?])/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
