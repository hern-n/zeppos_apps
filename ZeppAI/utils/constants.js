// Configuracion compartida entre el reloj (Device App) y el movil (Side Service).
// Aqui no hay ninguna API key: vive solo en el movil.

export const GROQ_HOST = 'https://api.groq.com/openai/v1'
export const GROQ_CHAT_URL = GROQ_HOST + '/chat/completions'

export const DEFAULT_MODEL = 'openai/gpt-oss-120b'
export const DEFAULT_SYSTEM_PROMPT =
  'Eres un asistente de IA que vive en un smartwatch. ' +
  'Responde de forma breve y clara, en el idioma del usuario. ' +
  'Sin Markdown, sin tablas, sin listas largas: texto plano y corto.'

// Las respuestas breves deben llegar rápido; peticiones HTTP largas pueden
// cerrarse si Zepp queda en segundo plano en el teléfono.
export const DEFAULT_REASONING_EFFORT = 'low'
export const DEFAULT_TEMPERATURE = 1
export const DEFAULT_TOP_P = 1
export const DEFAULT_MAX_COMPLETION_TOKENS = 768

// Timeout de la peticion HTTP al proveedor (ms)
export const FETCH_TIMEOUT_MS = 45000

// Limites de memoria de sesion (solo RAM del reloj)
export const MAX_HISTORY_MESSAGES = 20
export const MAX_MESSAGE_CHARS = 1200

// Streaming: troceamos la respuesta en trozos para enviarlos por BLE
export const STREAM_CHUNK_CHARS = 48
export const STREAM_CHUNK_DELAY_MS = 60
export const BLE_SAFE_CHUNK_BYTES = 900

// Claves de settings del movil
export const KEY_SETTING_GROQ_KEY = 'groqApiKey'
export const KEY_SETTING_MODEL = 'groqModel'
export const KEY_SETTING_SYSTEM_PROMPT = 'groqSystemPrompt'
export const KEY_SETTING_REASONING = 'groqReasoningEffort'
