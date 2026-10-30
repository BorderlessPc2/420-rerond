export const nomeGestao = (valor: string) => {
  const texto = valor.trim().replaceAll('_', ' ')
  return texto ? texto[0].toUpperCase() + texto.slice(1) : '—'
}

export const formatarDataGestao = (valor?: string) => {
  if (!valor) return '—'
  const data = new Date(`${valor}T00:00:00`)
  return Number.isNaN(data.getTime()) ? valor : new Intl.DateTimeFormat('pt-BR').format(data)
}
