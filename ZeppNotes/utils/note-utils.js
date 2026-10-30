/**
 * Logica pura de ZeppNotes: sin dependencias de Zepp OS, testeable en Node.
 * La persistencia vive en utils/store.js; aqui solo transformaciones.
 */
import { MAX_CHARS, MAX_NOTES, MAX_IMPORTANT, TITLE_PREVIEW_CHARS } from './constants.js'

export function clampContent(raw) {
  return String(raw === undefined || raw === null ? '' : raw).slice(0, MAX_CHARS)
}

export function isFull(notes) {
  return Array.isArray(notes) && notes.length >= MAX_NOTES
}

export function canAdd(notes) {
  return !isFull(notes)
}

/** Titulo derivado: primera linea recortada a TITLE_PREVIEW_CHARS. */
export function noteTitle(content, emptyLabel) {
  const first = String(content || '').split('\n')[0].trim()
  if (!first) return emptyLabel === undefined ? '(vacía)' : emptyLabel
  return first.length > TITLE_PREVIEW_CHARS
    ? first.slice(0, TITLE_PREVIEW_CHARS) + '…'
    : first
}

/** Fecha corta dd/mm hh:mm en hora local del reloj. */
export function formatDate(ts) {
  const d = new Date(Number(ts) || Date.now())
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** Orden: recientes primero (updatedAt descendente). No muta el array. */
export function sortNotes(notes) {
  return (Array.isArray(notes) ? notes.slice() : []).sort(
    (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0)
  )
}

export function makeId() {
  return Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36)
}

export function createNote(content) {
  const text = clampContent(content).trim()
  if (!text) return null
  const now = Date.now()
  return { id: makeId(), content: text, updatedAt: now, important: false }
}

// ----------------------------------------------------------- Favoritas ----

export function isImportant(note) {
  return !!(note && note.important)
}

export function importantCount(notes) {
  if (!Array.isArray(notes)) return 0
  let n = 0
  for (let i = 0; i < notes.length; i += 1) {
    if (isImportant(notes[i])) n += 1
  }
  return n
}

/** Solo se pueden fijar MAX_IMPORTANT notas. */
export function canMarkImportant(notes) {
  return importantCount(notes) < MAX_IMPORTANT
}

/**
 * Orden de lectura: fijadas primero (y dentro, las mas recientes),
 * despues el resto por recencia. No muta el array de entrada.
 */
export function orderedNotes(notes) {
  const list = Array.isArray(notes) ? notes : []
  const pinned = []
  const rest = []
  for (let i = 0; i < list.length; i += 1) {
    if (isImportant(list[i])) pinned.push(list[i])
    else rest.push(list[i])
  }
  return sortNotes(pinned).concat(sortNotes(rest))
}

/** Las `count` notas a mostrar en el Widget / Shortcut Card. */
export function selectNotes(notes, count) {
  const limit = Number(count)
  if (!limit || limit <= 0) return []
  return orderedNotes(notes).slice(0, limit)
}

/** Sanea una lista cargada del almacenamiento: forma valida + limites. */
export function sanitizeNotes(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (let i = 0; i < raw.length && out.length < MAX_NOTES; i += 1) {
    const n = raw[i]
    if (!n || typeof n !== 'object') continue
    const content = clampContent(n.content).trim()
    if (!content) continue
    out.push({
      id: String(n.id || makeId()),
      content,
      updatedAt: Number(n.updatedAt) || 0,
      important: n.important === true
    })
  }
  return sortNotes(out)
}

export function parsePageParams(params) {
  if (!params) return {}
  if (typeof params === 'object') return params
  if (typeof params !== 'string') return {}
  const trimmed = params.trim()
  if (!trimmed) return {}
  try {
    return JSON.parse(trimmed)
  } catch (e) {
    return {}
  }
}
