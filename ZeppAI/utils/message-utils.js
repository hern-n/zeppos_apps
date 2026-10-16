/**
 * Logica pura compartida: troceado de texto para el streaming BLE y recorte
 * del historial de sesion. Sin dependencias de Zepp OS, testeable en Node.
 *
 * La busqueda web la decide el modelo en el servidor (tool browser_search
 * en app-side para los modelos gpt-oss): no hay prefijo en el reloj.
 */

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
