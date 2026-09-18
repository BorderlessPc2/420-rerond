/**
 * Sanitiza textos produzidos pela IA para exibição e PDF.
 * Remove tags HTML e caracteres de controle sem interpretar como HTML.
 */
export function repairCommonMojibake(value: string): string {
  if (!/[ÃÂâ]/.test(value)) return value

  const repairedByMap = value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã/g, 'Á')
    .replace(/Ã€/g, 'À')
    .replace(/Ã‚/g, 'Â')
    .replace(/Ãƒ/g, 'Ã')
    .replace(/Ã‰/g, 'É')
    .replace(/ÃŠ/g, 'Ê')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã”/g, 'Ô')
    .replace(/Ã•/g, 'Õ')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‡/g, 'Ç')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€¦/g, '…')

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const score = (text: string) => (text.match(/[ÃÂ�]/g) ?? []).length
    return score(decoded) < score(repairedByMap) ? decoded : repairedByMap
  } catch {
    return repairedByMap
  }
}

export function sanitizeText(value: unknown, maxLength = 8000): string {
  if (value == null) return ''
  let text = repairCommonMojibake(String(value))

  // Remove tags HTML/XML sem executar
  text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<\/?[^>]+>/g, '')

  // Entidades comuns
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  // Controle (exceto \n \r \t)
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

  text = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim()

  if (text.length > maxLength) {
    return `${text.slice(0, maxLength - 1)}…`
  }
  return text
}

export function slugifyFilenamePart(value: string, fallback = 'na'): string {
  const slug = sanitizeText(value, 80)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return slug || fallback
}

export function formatDateIsoLocal(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildRelatorioPdfFileName(params: {
  concessionaria: string
  projeto: string
  data?: Date
}): string {
  const concessionaria = slugifyFilenamePart(params.concessionaria, 'concessionaria')
  const projeto = slugifyFilenamePart(params.projeto, 'projeto')
  const data = formatDateIsoLocal(params.data ?? new Date())
  return `relatorio-conformidade-${concessionaria}-${projeto}-${data}.pdf`
}
