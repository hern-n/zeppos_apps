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

const logger = log.getLogger('chat')

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
        color: 0xff6666,
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
      this.draftText.setProperty(prop.COLOR, 0xff6666)
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
    // Boton superior: ENVIAR
    this.sendBtn = createWidget(widget.BUTTON, {
      x: px(143),
      y: px(20),
      w: px(180),
      h: px(64),
      text: getText('chatSend'),
      radius: px(32),
      normal_color: 0x1f6feb,
      pressed_color: 0x1550b0,
      color: 0xffffff,
      text_size: px(32),
      click_func: () => this.send()
    })

    // Historial de la conversacion
    this.historyViewport = createWidget(widget.VIEW_CONTAINER, {
      x: px(20),
      y: px(86),
      w: px(426),
      h: px(254),
      scroll_enable: 1,
      pos_y: 0
    })
    this._lastContentHeight = px(254)
    this._historyRenderTimer = null
    this._historyRenderPending = false

    this.historyText = this.historyViewport.createWidget(widget.TEXT, {
      x: 0,
      y: 0,
      w: px(426),
      h: px(254),
      text: getText('chatEmpty'),
      color: 0xffffff,
      text_size: px(28),
      text_style: text_style.WRAP
    })

    // Zona inferior: borrador, respuesta en streaming o estado
    this.draftText = createWidget(widget.TEXT, {
      x: px(43),
      y: px(346),
      w: px(380),
      h: px(36),
      text: '',
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      color: 0x666666,
      text_size: px(28)
    })

    // Abrir el teclado solo tras tocarlo: algunos firmwares dejan una pantalla
    // negra si el teclado del sistema se crea automáticamente al navegar.
    this.kbBtn = createWidget(widget.BUTTON, {
      x: px(88),
      y: px(384),
      w: px(140),
      h: px(54),
      text: getText('chatWrite'),
      radius: px(27),
      normal_color: 0x2d2d34,
      pressed_color: 0x48484f,
      color: 0xffffff,
      text_size: px(24),
      click_func: () => this.openKeyboard()
    })

    this.bottomSendBtn = createWidget(widget.BUTTON, {
      x: px(238),
      y: px(384),
      w: px(140),
      h: px(54),
      text: getText('chatSend'),
      radius: px(27),
      normal_color: 0x1f6feb,
      pressed_color: 0x1550b0,
      color: 0xffffff,
      text_size: px(26),
      click_func: () => this.send()
    })
  },

  renderHistory() {
    const answers = this.state.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content)

    if (this.state.streaming) answers.push(this.state.streaming)

    const transcript = answers.join('\n\n') || getText('chatEmpty')

    const layout = getTextLayout(transcript, {
      text_size: px(28),
      text_width: px(426),
      wrapped: 1
    })
    const contentHeight = Math.max(px(254), layout && layout.height ? layout.height + px(12) : px(254))
    this._lastContentHeight = contentHeight

    // Un solo camino: pintamos texto + altura juntos y anclamos al final.
    // Al hacerlo pocas veces por segundo (throttle en streaming) el texto
    // deja de "bailar": crece de forma estable y sigue llegando palabra
    // por palabra.
    this.historyText.setProperty(prop.MORE, {
      text: transcript,
      h: contentHeight
    })
    this.historyViewport.setProperty(prop.MORE, {
      pos_y: Math.max(0, contentHeight - px(254))
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
      this.updateState({ draft: getText('chatNoKeyboard') })
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
    const { sending, error } = this.state
    const text = error || (sending ? getText('chatThinking') : '')
    this.draftText.setProperty(prop.TEXT, text)
    this.draftText.setProperty(prop.COLOR, error ? 0xff7777 : 0xaaaaaa)
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
