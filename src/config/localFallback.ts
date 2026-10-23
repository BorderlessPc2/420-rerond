export function isLocalFallbackEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === 'true'
}

export function localFallbackError(message: string): Error {
  return new Error(`${message} Firestore indisponível; dados não foram sincronizados.`)
}
