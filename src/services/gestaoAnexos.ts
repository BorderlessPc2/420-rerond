const MIME_POR_EXTENSAO: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
}

export const mimeAnexoGestao = (file: File) => {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const extensao = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_POR_EXTENSAO[extensao] ?? 'application/octet-stream'
}

export const anexoGestaoPermitido = (file: File) => {
  const tipos = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]
  return tipos.includes(file.type) || ((!file.type || file.type === 'application/octet-stream') && /\.(pdf|png|jpe?g|docx?|txt)$/i.test(file.name))
}