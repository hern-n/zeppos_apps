import { MessageBuilder } from '../shared/message-side'
import {
  GROQ_CHAT_URL,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_REASONING_EFFORT,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_MAX_COMPLETION_TOKENS,
  STREAM_CHUNK_CHARS,
  STREAM_CHUNK_DELAY_MS,
  KEY_SETTING_GROQ_KEY,
  KEY_SETTING_MODEL,
  KEY_SETTING_SYSTEM_PROMPT,
  KEY_SETTING_REASONING
} from '../utils/constants'
import { splitIntoChunks } from '../utils/message-utils'

const messageBuilder = new MessageBuilder()
const logger = typeof console !== 'undefined' ? console : { log() {}, warn() {}, error() {} }

// ---------------------------------------------------------------- config ----

// Import diferido y protegido: app-side/dev-config.local.js solo existe en
// desarrollo (lo genera npm run dev:config desde .env.local). En produccion
// el fichero no esta y este bloque se salta sin romper la app.
function readDevConfig() {
  try {
    const name = './dev-config.local'
    // require con ruta variable evita que el empaquetador lo resuelva en build.
    const req = typeof require === 'function' ? require : null
    if (!req) return null
    return req(name)
  } catch (e) {
    return null
  }
}

const DEV_CONFIG = readDevConfig() || {}

function getSetting(key, fallback) {
  try {
    const value = settings.settingsStorage.getItem(key)
    return value === undefined || value === null || value === '' ? fallback : value
  } catch (e) {
    return fallback
  }
}

// En desarrollo la clave puede venir de .env.local (inyectada al empaquetar);
// en produccion se guarda en los Ajustes de la Zepp App.
function getApiKey() {
  const fromSettings = getSetting(KEY_SETTING_GROQ_KEY, '')
  if (fromSettings) return fromSettings

  try {
    if (typeof process !== 'undefined' && process.env && process.env.GROQ_API_KEY) {
      return process.env.GROQ_API_KEY
    }
  } catch (e) {}

  // Fallback de desarrollo: app-side/dev-config.local.js (generado, gitignored).
  // En produccion este import falla y se ignora, usando solo los Ajustes.
  try {
    if (DEV_CONFIG.DEV_CONFIG_ENABLED && DEV_CONFIG.DEV_GROQ_API_KEY) {
      return DEV_CONFIG.DEV_GROQ_API_KEY
    }
  } catch (e) {}

  return ''
}

function getSystemPrompt() {
  return getSetting(KEY_SETTING_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT)
}

// ------------------------------------------------------------- utilidades ----

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractText(json) {
  if (!json) return ''
  if (typeof json.error === 'object' && json.error) {
    throw new Error(json.error.message || 'Error del proveedor')
  }

  const choice = json.choices && json.choices[0]
  if (!choice) return ''

  const message = choice.message || {}
  // Los modelos con razonamiento separan el razonamiento del texto final.
  return (message.content || '').trim()
}

// ------------------------------------------------------- peticion a Groq ----

function callGroq({ messages }) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('Falta la API key. Abrir Ajustes de ZeppAI en la Zepp App.')
  }

  const model = getSetting(KEY_SETTING_MODEL, DEFAULT_MODEL)
  const browserSearchModels = [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-safeguard-20b'
  ]
  const browserSearchAvailable = browserSearchModels.indexOf(model) >= 0
  const systemPrompt = getSystemPrompt() + (browserSearchAvailable
    ? '\n\nTienes disponible la búsqueda web. Decide tú si hace falta usarla: ' +
      'úsala para información reciente, cambiante o que necesite verificación; ' +
      'no la uses para conocimientos generales estables, conversación o tareas creativas.'
    : '')

  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }].concat(messages),
    temperature: DEFAULT_TEMPERATURE,
    max_completion_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
    top_p: DEFAULT_TOP_P,
    reasoning_effort: getSetting(KEY_SETTING_REASONING, DEFAULT_REASONING_EFFORT),
    stream: false,
    stop: null
  }
  logger.log('[zeppai][groq] petición preparada', {
    model: payload.model,
    reasoning: payload.reasoning_effort,
    browserSearchAvailable,
    messageCount: messages.length,
    apiKeyPresent: !!apiKey
  })

  // Groq ejecuta browser_search en sus servidores solo cuando el modelo
  // elige la herramienta. Con "auto" también puede responder directamente.
  if (browserSearchAvailable) {
    payload.tools = [{ type: 'browser_search' }]
    payload.tool_choice = 'auto'
  }

  const startedAt = Date.now()
  return fetch({
    url: GROQ_CHAT_URL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify(payload)
  }).then((res) => {
    logger.log('[zeppai][groq] respuesta HTTP', {
      status: res && res.status,
      elapsedMs: Date.now() - startedAt
    })
    if (!res || !res.body) {
      throw new Error('Respuesta vacia del proveedor')
    }
    const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body
    if (res.status >= 400) {
      const detail = body && body.error && body.error.message
      throw new Error(detail || 'Groq respondio con HTTP ' + res.status)
    }
    return body
  })
}

// ------------------------------------------------------------- streaming ----

function streamToWatch(reqId, text) {
  const chunks = splitIntoChunks(text, STREAM_CHUNK_CHARS)
  const full = chunks.join('')
  let sent = 0

  const step = function () {
    if (sent >= chunks.length) return Promise.resolve()

    return messageBuilder
      .call({
        type: 'CHAT_CHUNK',
        reqId: reqId,
        text: chunks[sent]
      })
      .then(() => {
        sent += 1
        return delay(STREAM_CHUNK_DELAY_MS)
      })
      .then(step)
      .catch(() => {})
  }

  return step()
    .catch(() => {})
    .then(() =>
      messageBuilder.call({
        type: 'CHAT_DONE',
        reqId: reqId,
        text: full
      })
    )
}

function sendError(reqId, message) {
  return messageBuilder.call({
    type: 'CHAT_ERROR',
    reqId: reqId,
    message: message
  })
}

// ----------------------------------------------------------------- init ----

AppSideService({
  onInit() {
    logger.log('[zeppai][service] onInit')
    messageBuilder.listen(() => {})
    logger.log('[zeppai][service] listener MessageBuilder iniciado')

    // El reloj usa MessageBuilder.call(), que viaja como evento "call" (Notify).
    // Las respuestas de Groq también se envían como "call" hacia el reloj.
    messageBuilder.on('call', (ctx) => {
      let payload
      try {
        payload = messageBuilder.buf2Json(ctx.payload)
      } catch (error) {
        logger.error('[zeppai][service] no se pudo decodificar mensaje del reloj', error)
        return
      }
      if (!payload || payload.method !== 'CHAT') return

      const reqId = payload.reqId
      const messages = Array.isArray(payload.messages) ? payload.messages : []
      logger.log('[zeppai][service] petición CHAT recibida', {
        reqId,
        messageCount: messages.length,
        chars: messages.reduce((total, message) => total + ((message && message.content) || '').length, 0)
      })

      callGroq({ messages: messages })
        .then((json) => {
          const text = extractText(json)
          logger.log('[zeppai][service] respuesta Groq procesada', { reqId, chars: text.length })
          if (!text) return sendError(reqId, 'La IA no devolvio texto')
          return streamToWatch(reqId, text)
        })
        .catch((err) => {
          const message = (err && err.message) || 'Error de la IA'
          logger.error('[zeppai][service] fallo procesando petición', { reqId, error: message, stack: err && err.stack })
          return sendError(reqId, message.slice(0, 120))
        })
    })
  },

  onRun() {
    logger.log('[zeppai][service] onRun')
  },

  onDestroy() {
    logger.log('[zeppai][service] onDestroy')
  }
})
