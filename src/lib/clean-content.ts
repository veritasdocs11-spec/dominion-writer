/**
 * Sanitizes and cleans AI-generated HTML book content.
 * Strips markdown code blocks, backticks, stray ```html tags,
 * and AI refusal prefixes to ensure clean, publication-ready typography.
 */
export function cleanAiContent(raw: string): string {
  if (!raw) return ''

  let text = raw.trim()

  // 1. Remove markdown code fences at the start: ```html, ```htm, ```xml, ```
  text = text.replace(/^```(?:html|xml|htm)?\s*\n?/i, '')
  text = text.replace(/^<p>\s*```(?:html|xml|htm)?\s*<\/p>\s*/i, '')
  text = text.replace(/^<p>\s*```(?:html|xml|htm)?\s*<br\s*\/?>/i, '<p>')

  // 2. Remove markdown code fences at the end: ```
  text = text.replace(/\n?```\s*$/i, '')
  text = text.replace(/\s*<p>\s*```\s*<\/p>$/i, '')
  text = text.replace(/<br\s*\/?>\s*```\s*<\/p>$/i, '</p>')

  // 3. Remove any standalone ```html, ``` or ``` scattered in paragraphs
  text = text.replace(/<p>\s*`{1,4}(?:html|xml|htm)?\s*<\/p>/gi, '')
  text = text.replace(/`{3,}(?:html|xml|htm)?/gi, '')
  text = text.replace(/`{3,}/g, '')

  // 4. Remove leading/trailing backticks
  text = text.replace(/^`+|`+$/g, '').trim()

  // 5. If wrapped in outer <html><body> tags, extract the inner body content
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    text = bodyMatch[1].trim()
  }

  // 6. Clean empty paragraphs at beginning or end
  text = text.replace(/^(?:<p>\s*(?:<br\s*\/?>|&nbsp;|\s*)*<\/p>\s*)+/i, '')
  text = text.replace(/(?:<p>\s*(?:<br\s*\/?>|&nbsp;|\s*)*<\/p>\s*)+$/i, '')

  // 7. If no HTML tags are present at all, wrap double newlines into clean <p> paragraphs
  if (!/<(?:p|div|h[1-6]|ul|ol|blockquote)[\s>]/i.test(text)) {
    text = text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n')
  }

  return text.trim()
}

/**
 * Checks if the AI output is a refusal or error message
 */
export function isAiRefusal(text: string): boolean {
  if (!text) return true
  const lower = text.toLowerCase().trim()
  return (
    lower.startsWith("i'm sorry") ||
    lower.startsWith("i am sorry") ||
    lower.startsWith("as an ai") ||
    lower.startsWith("i cannot fulfill") ||
    lower.startsWith("i can't fulfill") ||
    lower.startsWith("my apologies") ||
    lower.includes("content policy") ||
    lower.includes("cannot write") ||
    (lower.split(/\s+/).length < 25 && lower.includes("sorry"))
  )
}
