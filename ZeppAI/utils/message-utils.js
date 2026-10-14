/**
 * Logica pura compartida: deteccion del prefijo de busqueda y troceado de texto.
 * Sin dependencias de Zepp OS, para poder testearlo en Node.
 */

export const SEARCH_PREFIX = '!'

/**
 * Decide si un mensaje lleva busqueda web y limpia el prefijo.
 * Regla fija, aplicada por el algoritmo y no por la IA:
 *   - empieza por '!'  => hay busqueda
 *   - en cualquier otro caso => no la hay
 *
 * @param {string} raw texto tal cual lo escribio el usuario
 * @returns {{ search: boolean, content: string }} search indica si hay
 *   busqueda; content es el texto ya sin el prefijo '!'.
 */
export function parseSearchPrefix(raw) {
  const text = String(raw === undefined || raw === null ? '' : raw).trim()

  if (text.charAt(0) === SEARCH_PREFIX) {
    return { search: true, content: text.slice(SEARCH_PREFIX.length).trim() }
  }

  return { search: false, content: text }
}

/**
 * Trocea el texto en trozos de como mucho `size` caracteres,
 * cortando en espacios para no partir palabras.
 *
 * @param {string} text
 * @param {number} size
 * @returns {string[]}
 */
export function splitIntoChunks(text, size) {
  const value = String(text === undefined || text === null ? '' : text)
  const limit = Math.max(1, size | 0)

  const chunks = []
  let rest = value

  while (rest.length > limit) {
    let cut = rest.lastIndexOf(' ', limit)
    if (cut <= 0) cut = limit

    chunks.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }

  if (rest.length > 0) chunks.push(rest)

  return chunks
}

/**
 * Limita el historial de sesion: recorta por delante y por tamano de mensaje.
 * Todo en memoria, nada se persiste.
 *
 * @param {Array<{role:string, content:string}>} messages
 * @param {number} maxMessages numero maximo de mensajes
 * @param {number} maxChars numero maximo de caracteres por mensaje
 * @returns {Array<{role:string, content:string}>}
 */
export function limitHistory(messages, maxMessages, maxChars) {
  const list = Array.isArray(messages) ? messages.slice() : []

  return list
    .map((m) => ({
      role: m.role,
      content: String(m.content === undefined || m.content === null ? '' : m.content).slice(0, maxChars)
    }))
    .slice(-Math.max(1, maxMessages))
}
