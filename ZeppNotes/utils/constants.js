// Limites y claves de ZeppNotes. Todo vive en el reloj, sin movil.

// 20 notas x 1500 caracteres ~= 30.000 caracteres (<100 KB con metadatos).
// Muy por debajo del limite practico de /data del Mini Program.
export const MAX_NOTES = 20
export const MAX_CHARS = 1500

// Favoritas: se pueden fijar hasta 3 notas.
export const MAX_IMPORTANT = 3

// Cuantas notas se muestran en cada superficie fuera de la app:
// el Widget (SecondaryWidget, pantalla completa) y la Shortcut Card
// (tarjeta de la pantalla negativa).
export const WIDGET_NOTES = 3
export const CARD_NOTES = 2

export const STORAGE_KEY = 'zeppnotes.v1'
export const STORAGE_FILE = 'zeppnotes.v1.json'

export const TITLE_PREVIEW_CHARS = 32
