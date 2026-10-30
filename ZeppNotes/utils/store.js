/**
 * Persistencia 100% local del reloj (Zepp OS).
 *
 * Backend principal: @zos/storage (LocalStorage) -> fichero privado en /data.
 * Respaldo: @zos/fs (data://) si LocalStorage falla.
 *
 * No importa ni usa @zos/ble, MessageBuilder ni app-side: funciona sin movil.
 */
import { localStorage } from '@zos/storage'
import { readFileSync, writeFileSync, statSync } from '@zos/fs'
import { STORAGE_KEY, STORAGE_FILE, MAX_NOTES, MAX_IMPORTANT } from './constants.js'
import { sanitizeNotes, sortNotes, isImportant } from './note-utils.js'

function readBackupFile() {
  try {
    const stat = statSync({ path: STORAGE_FILE })
    if (!stat) return []
    const raw = readFileSync({
      path: STORAGE_FILE,
      options: { encoding: 'utf8' }
    })
    if (!raw) return []
    return sanitizeNotes(JSON.parse(raw))
  } catch (e) {
    return []
  }
}

function writeBackupFile(notes) {
  try {
    writeFileSync({
      path: STORAGE_FILE,
      data: JSON.stringify(notes),
      options: { encoding: 'utf8' }
    })
  } catch (e) {
    // El respaldo es best-effort: LocalStorage ya guardo los datos.
  }
}

export function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return readBackupFile()
    return sanitizeNotes(JSON.parse(raw))
  } catch (e) {
    return readBackupFile()
  }
}

/** Defensa: nunca se persisten mas de MAX_IMPORTANT notas fijadas. */
function limitImportant(notes) {
  let left = MAX_IMPORTANT
  return notes.map((n) => {
    if (!isImportant(n)) return n
    if (left > 0) {
      left -= 1
      return n
    }
    return Object.assign({}, n, { important: false })
  })
}

function persist(notes) {
  const ordered = limitImportant(sortNotes(notes).slice(0, MAX_NOTES))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered))
  } catch (e) {
    // Si LocalStorage falla, al menos intentamos el fichero.
  }
  writeBackupFile(ordered)
  return ordered
}

export function getNote(id) {
  const notes = loadNotes()
  for (let i = 0; i < notes.length; i += 1) {
    if (notes[i].id === id) return notes[i]
  }
  return null
}

/** Inserta o actualiza por id. Devuelve { notes, ok, reason }. */
export function upsertNote(note) {
  if (!note || !note.content) return { notes: loadNotes(), ok: false, reason: 'empty' }
  const notes = loadNotes()
  let found = false
  const next = notes.map((n) => {
    if (n.id === note.id) {
      found = true
      return note
    }
    return n
  })
  if (!found) {
    if (next.length >= MAX_NOTES) return { notes, ok: false, reason: 'full' }
    next.push(note)
  }
  return { notes: persist(next), ok: true, reason: '' }
}

export function removeNote(id) {
  const notes = loadNotes().filter((n) => n.id !== id)
  return persist(notes)
}

/**
 * Fija/destilda una nota. Devuelve { notes, ok, reason, important }.
 * reason: 'missing' si no existe, 'limit' si ya hay MAX_IMPORTANT fijadas.
 */
export function toggleImportant(id) {
  const notes = loadNotes()
  let target = null
  for (let i = 0; i < notes.length; i += 1) {
    if (notes[i].id === id) {
      target = notes[i]
      break
    }
  }
  if (!target) return { notes, ok: false, reason: 'missing', important: false }

  const next = !target.important
  if (next && notes.filter(isImportant).length >= MAX_IMPORTANT) {
    return { notes, ok: false, reason: 'limit', important: false }
  }

  const updated = notes.map((n) => (n.id === id ? Object.assign({}, n, { important: next }) : n))
  return { notes: persist(updated), ok: true, reason: '', important: next }
}
