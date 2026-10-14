// Limites y claves de ZeppNotes. Todo vive en el reloj, sin movil.

// 20 notas x 1500 caracteres ~= 30.000 caracteres (<100 KB con metadatos).
// Muy por debajo del limite practico de /data del Mini Program.
export const MAX_NOTES = 20
export const MAX_CHARS = 1500

export const STORAGE_KEY = 'zeppnotes.v1'
export const STORAGE_FILE = 'zeppnotes.v1.json'

export const TITLE_PREVIEW_CHARS = 32
