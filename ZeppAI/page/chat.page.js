import { createWidget, widget, prop, align, text_style, createKeyboard, deleteKeyboard, inputType, getTextLayout } from '@zos/ui'
import { px, log } from '@zos/utils'
import { getText } from '@zos/i18n'
import { connectStatus } from '@zos/ble'
import { replace } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS
} from '../utils/constants'
import { limitHistory } from '../utils/message-utils'
import { reportError } from '../utils/error-utils'
import { C } from '../utils/theme'

const logger = log.getLogger('chat')

// Maquetacion 466x466: la respuesta de la IA manda. Todo lo demas
// (marca, barra de entrada y boton) vive por encima y por debajo de la
// zona de texto, respetando el area segura del circulo.
const L = {
  brand: { x: 133, y: 26, w: 200, h: 26 },
  // El texto de la IA ocupa todo el ancho posible: el limite real es el
  // borde redondeado, que en la primera linea (y=104) deja x=39..427.
  view: { x: 42, y: 104, w: 382, h: 216 },
  text: { x: 0, w: 382 },
  // Filete fuera del texto, en la franja donde el circulo ya es ancho.
  rule: { x: 20, y: 140, w: 5, h: 166 },
  pill: { x: 93, y: 326, w: 280, h: 54 },
  pillText: { x: 105, y: 330, w: 256, h: 46 },
  send: { x: 133, y: 386, w: 200, h: 52 }
}

// Sin conexion al movil no hay IA: vamos a la pantalla de bloqueo.
Page({
  state: {
    // Memoria de sesion. SOLO RAM: se pierde al salir de la app.
    messages: [],
    draft: '',
    kbMode: 'CHAR', // El chat arranca listo para escribir texto.
    sending: false,
    streaming: '',
    error: ''
  },

  onInit() {
    logger.log('[lifecycle] chat onInit')
    this.streamingText = ''
    this.reqId = 0
    try {
      this.disconnected = !connectStatus()
    } catch (error) {
      reportError(logger, '[ble] connectStatus', error)
      this.disconnected = true
    }
    logger.log('[ble] estado al iniciar chat', { connected: !this.disconnected })
    if (this.disconnected) {
      replace({ url: 'page/index.page' })
    }
  },

  updateState(patch) {
    // Zepp Page expone state como objeto; no implementa el setState de React.
    Object.assign(this.state, patch)
  },

  build() {
    logger.log('[lifecycle] chat build', { disconnected: this.disconnected })
    if (this.disconnected) return
    try {
      this.buildUI()
    } catch (error) {
      reportError(logger, '[chat] build', error)
      createWidget(widget.TEXT, {
        x: px(20),
        y: px(188),
        w: px(426),
        h: px(90),
        text: getText('chatBuildError'),
        color: C.error,
        text_size: px(30),
        align_h: align.CENTER_H,
        text_style: text_style.NONE
      })
      return
    }

    const app = getApp()
    const messageBuilder = app && app._options && app._options.globalData
      ? app._options.globalData.messageBuilder
      : null
    if (!messageBuilder) {
      this.draftText.setProperty(prop.TEXT, getText('chatNoService'))
      this.draftText.setProperty(prop.COLOR, C.error)
      logger.error('No hay conexión con el servicio del móvil')
      return
    }
    logger.log('[ble] MessageBuilder disponible; registrando listener call')

    this.streamHandler = (ctx) => {
      let data = null
      try {
        data = messageBuilder.buf2Json(ctx.payload)
      } catch (error) {
        reportError(logger, '[chat] mensaje ilegible del móvil', error)
        return
      }
      this.onStream(data)
    }
    messageBuilder.on('call', this.streamHandler)

    this.renderHistory()
    this.renderDraft()

  },

  // ---------------------------------------------------------------- UI ----

  buildUI() {
    // Fondo con la identidad propia de ZeppAI (gama de verdes).
    createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(466),
      h: px(466),
      color: C.bg
    })

    // Marca discreta arriba: no compite con la respuesta de la IA.
    createWidget(widget.TEXT, {
      x: px(L.brand.x),
      y: px(L.brand.y),
      w: px(L.brand.w),
      h: px(L.brand.h),
      text: getText('gateTitle'),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(20),
      char_space: px(4),
      color: C.accent
    })

    // Filete lima a la izquierda del texto: marca lo que es de la IA.
    createWidget(widget.FILL_RECT, {
      x: px(L.rule.x),
      y: px(L.rule.y),
      w: px(L.rule.w),
      h: px(L.rule.h),
      radius: px(3),
      color: C.ai
    })

    // Historial de la conversacion (solo respuestas de la IA).
    this.historyViewport = createWidget(widget.VIEW_CONTAINER, {
      x: px(L.view.x),
      y: px(L.view.y),
      w: px(L.view.w),
      h: px(L.view.h),
      scroll_enable: 1,
      pos_y: 0
    })
    this._lastContentHeight = px(L.view.h)
    this._historyRenderTimer = null
    this._historyRenderPending = false

    this.historyText = this.historyViewport.createWidget(widget.TEXT, {
      x: px(L.text.x),
      y: 0,
      w: px(L.text.w),
      h: px(L.view.h),
      text: getText('chatEmpty'),
      color: C.textDim,
      text_size: px(34),
      text_style: text_style.WRAP
    })

    // Barra de entrada: se ve el borrador (o el estado) y al tocarla
    // abre el teclado. Abrirlo solo tras tocarlo: algunos firmwares
    // dejan una pantalla negra si el teclado se crea automaticamente.
    this.pillBtn = createWidget(widget.BUTTON, {
      x: px(L.pill.x),
      y: px(L.pill.y),
      w: px(L.pill.w),
      h: px(L.pill.h),
      text: '',
      radius: px(27),
      normal_color: C.surface,
      press_color: C.surfacePressed,
      click_func: () => this.openKeyboard()
    })

    this.draftText = createWidget(widget.TEXT, {
      x: px(L.pillText.x),
      y: px(L.pillText.y),
      w: px(L.pillText.w),
      h: px(L.pillText.h),
      text: '',
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(24),
      color: C.textMuted
    })

    // Accion principal, centrada y dentro del area segura.
    this.sendBtn = createWidget(widget.BUTTON, {
      x: px(L.send.x),
      y: px(L.send.y),
      w: px(L.send.w),
      h: px(L.send.h),
      text: getText('chatSend'),
      radius: px(26),
      normal_color: C.accent,
      press_color: C.accentPressed,
      color: 0x06140b,
      text_size: px(30),
      click_func: () => this.send()
    })
  },

  renderHistory() {
    const answers = this.state.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content)

    if (this.state.streaming) answers.push(this.state.streaming)

    const transcript = answers.join('\n\n') || getText('chatEmpty')
    const isEmpty = answers.length === 0
    const viewportH = px(L.view.h)

    const layout = getTextLayout(transcript, {
      text_size: px(34),
      text_width: px(L.text.w),
      wrapped: 1
    })
    const contentHeight = Math.max(viewportH, layout && layout.height ? layout.height + px(12) : viewportH)
    this._lastContentHeight = contentHeight

    // Un solo camino: pintamos texto + altura juntos y anclamos al final.
    // Al hacerlo pocas veces por segundo (throttle en streaming) el texto
    // deja de "bailar": crece de forma estable y sigue llegando palabra
    // por palabra.
    this.historyText.setProperty(prop.MORE, {
      text: transcript,
      h: contentHeight
    })
    // Estado vacio tenue; la respuesta de la IA, maximamente legible.
    this.historyText.setProperty(prop.COLOR, isEmpty ? C.textDim : C.text)
    this.historyViewport.setProperty(prop.MORE, {
      pos_y: Math.max(0, contentHeight - viewportH)
    })
  },

  // Durante el streaming los chunks llegan palabra por palabra (muy rapido).
  // Repintar en cada chunk recalcula el wrapping y mueve el scroll sin parar.
  // Limitamos el repintado a ~3 veces por segundo: sigue viendose en directo
  // pero estable.
  _scheduleHistoryRender() {
    if (this._historyRenderTimer) {
      this._historyRenderPending = true
      return
    }
    this.renderHistory()
    this._historyRenderTimer = setTimeout(() => {
      this._historyRenderTimer = null
      if (this._historyRenderPending) {
        this._historyRenderPending = false
        this._scheduleHistoryRender()
      }
    }, 350)
  },

  _flushHistoryRender() {
    if (this._historyRenderTimer) {
      clearTimeout(this._historyRenderTimer)
      this._historyRenderTimer = null
    }
    this._historyRenderPending = false
    this.renderHistory()
  },

  // ----------------------------------------------------------- Teclado ----

  openKeyboard() {
    logger.log('[ui] solicitando teclado', { mode: this.state.kbMode })
    const type = this.state.kbMode === 'NUM' ? inputType.NUM : inputType.CHAR

    try {
      createKeyboard({
        inputType: type,
        text: this.state.draft,
        onComplete: (_, result) => {
          logger.log('[ui] teclado completado', { chars: result && result.data ? result.data.length : 0 })
          deleteKeyboard()
          this.updateState({ draft: result && typeof result.data === 'string' ? result.data : this.state.draft })
          this.renderDraft()
        },
        onCancel: (_, result) => {
          // En Zepp OS, onCancel es el evento expuesto para deslizar a la
          // derecha sobre el teclado. Lo usamos para alternar CHAR/NUM y
          // volver a abrirlo conservando el texto parcial.
          const draft = result && typeof result.data === 'string'
            ? result.data
            : this.state.draft
          const nextMode = this.state.kbMode === 'NUM' ? 'CHAR' : 'NUM'
          logger.log('[ui] cambio de teclado solicitado al cancelar/deslizar', {
            from: this.state.kbMode,
            to: nextMode,
            chars: draft.length
          })
          deleteKeyboard()
          this.updateState({ draft, kbMode: nextMode })
          this.keyboardTimer = setTimeout(() => {
            this.keyboardTimer = null
            this.openKeyboard()
          }, 180)
        }
      })
    } catch (error) {
      reportError(logger, '[chat] openKeyboard', error)
      // No ensuciamos el borrador con el error: la barra ya lo muestra.
      this.updateState({ draft: '', error: getText('chatNoKeyboard') })
      this.renderDraft()
    }
  },

  // ------------------------------------------------------------ Envio ----

  send() {
    logger.log('[chat] send solicitado', { sending: this.state.sending, connected: connectStatus() })
    if (this.state.sending) return

    if (!connectStatus()) {
      replace({ url: 'page/index.page' })
      return
    }

    const raw = (this.state.draft || '').trim()
    if (!raw) return

    const content = raw

    const messages = limitHistory(
      this.state.messages.concat([{ role: 'user', content: content }]),
      MAX_HISTORY_MESSAGES,
      MAX_MESSAGE_CHARS
    )

    this.streamingText = ''
    this.updateState({ messages, draft: '', sending: true, streaming: '', error: '' })

    this.renderHistory()
    this.renderDraft()

    this.reqId += 1
    logger.log('[chat] enviando petición', {
      reqId: this.reqId,
      messageCount: messages.length,
      messageChars: content.length
    })
    const app = getApp()
    const messageBuilder = app && app._options && app._options.globalData
      ? app._options.globalData.messageBuilder
      : null
    if (!messageBuilder) {
      this.fail(getText('chatNoService'))
      return
    }

    messageBuilder
      .call({
        method: 'CHAT',
        reqId: this.reqId,
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      })
      .catch((err) => {
        reportError(logger, '[chat] MessageBuilder.call', err)
        this.fail(getText('chatSendFail'))
      })
  },

  // -------------------------------------------------------- Streaming ----

  onStream(data) {
    if (!data || data.reqId !== this.reqId) return
    logger.log('[chat] mensaje recibido del móvil', {
      type: data.type,
      reqId: data.reqId,
      chars: (data.text || data.message || '').length
    })

    if (data.type === 'CHAT_CHUNK') {
      this.streamingText += data.text || ''
      this.updateState({ streaming: this.streamingText })
      this._scheduleHistoryRender()
      this.renderDraft()

    } else if (data.type === 'CHAT_DONE') {
      const full = data.text || this.streamingText

      const messages = limitHistory(
        this.state.messages.concat([{ role: 'assistant', content: full }]),
        MAX_HISTORY_MESSAGES,
        MAX_MESSAGE_CHARS
      )

      this.streamingText = ''
      this.updateState({ messages, sending: false, streaming: '', error: '' })

      new Vibrator().start({ mode: VIBRATOR_SCENE_NOTIFICATION })

      this._flushHistoryRender()
      this.renderDraft()

    } else if (data.type === 'CHAT_ERROR') {
      this.fail(data.message || 'Error de la IA')
    }
  },

  fail(message) {
    logger.error('[chat] petición fallida', message)
    this.streamingText = ''
    this.updateState({ sending: false, streaming: '', error: message })
    this._flushHistoryRender()
    this.renderDraft()
  },

  renderDraft() {
    const { sending, error, draft } = this.state
    // Una sola barra con tres papeles: borrador, estado de la IA o
    // placeholder. El error manda porque es lo que hay que leer ya.
    let text = draft
    let color = C.text
    if (error) {
      text = error
      color = C.error
    } else if (sending) {
      text = getText('chatThinking')
      color = C.ai
    } else if (!draft) {
      text = getText('chatPlaceholder')
      color = C.textMuted
    }
    this.draftText.setProperty(prop.TEXT, text)
    this.draftText.setProperty(prop.COLOR, color)
  },

  onDestroy() {
    logger.log('[lifecycle] chat onDestroy')
    if (this.keyboardTimer) {
      clearTimeout(this.keyboardTimer)
      this.keyboardTimer = null
    }
    if (this._historyRenderTimer) {
      clearTimeout(this._historyRenderTimer)
      this._historyRenderTimer = null
    }
    this._historyRenderPending = false
    deleteKeyboard()

    const { messageBuilder } = getApp()._options.globalData
    if (messageBuilder && this.streamHandler) {
      messageBuilder.off('call', this.streamHandler)
    }

    // Sin memoria persistente: al salir se borra todo.
    this.updateState({ messages: [], draft: '', sending: false, streaming: '', error: '' })
    this.streamingText = ''
  }
})
