import { createWidget, widget, prop, align, text_style } from '@zos/ui'
import { px, log } from '@zos/utils'
import { getText } from '@zos/i18n'
import { connectStatus } from '@zos/ble'
import { replace } from '@zos/router'
import { reportError } from '../utils/error-utils'
import { C } from '../utils/theme'

const logger = log.getLogger('gate')

// Pantalla de bloqueo: sin conexion al movil la app no funciona.
Page({
  state: {
    checking: true
  },

  onInit() {
    logger.log('[lifecycle] gate onInit')
    // En el runtime Zepp Page, state es un objeto de datos (no React):
    // no existe this.setState().
    this.state.checking = true
  },

  build() {
    logger.log('[lifecycle] gate build')
    try {
      this.buildGate()
      this.check()
    } catch (error) {
      reportError(logger, '[gate] build', error)
    }
  },

  check() {
    let connected = false
    try {
      connected = connectStatus()
    } catch (error) {
      reportError(logger, '[ble] connectStatus', error)
    }
    logger.log('[ble] connectStatus', connected)

    if (this.stateText) {
      this.stateText.setProperty(prop.TEXT, connected ? getText('gateConnected') : getText('gateOffline'))
      this.stateText.setProperty(prop.COLOR, connected ? C.ok : C.error)
    }

    if (connected) {
      logger.log('[navigation] abriendo chat porque el móvil está conectado')
      setTimeout(() => {
        replace({ url: 'page/chat.page' })
      }, 350)
      return
    }

    if (this.retryBtn) {
      this.retryBtn.setProperty(prop.CLICK_FUNC, this.retry.bind(this))
    }
  },

  retry() {
    logger.log('[ble] reintento solicitado')

    this.stateText.setProperty(prop.TEXT, getText('gateSearching'))
    this.stateText.setProperty(prop.COLOR, C.textMuted)

    setTimeout(() => this.check(), 600)
  },

  buildGate() {
    createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(466),
      h: px(466),
      color: C.bg
    })

    // Filete cian sobre el titulo: mismo lenguaje que el chat.
    createWidget(widget.FILL_RECT, {
      x: px(211),
      y: px(40),
      w: px(44),
      h: px(6),
      radius: px(3),
      color: C.ai
    })

    createWidget(widget.TEXT, {
      x: px(93),
      y: px(56),
      w: px(280),
      h: px(64),
      text: getText('gateTitle'),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(46),
      char_space: px(4),
      color: C.text
    })

    createWidget(widget.TEXT, {
      x: px(46),
      y: px(130),
      w: px(374),
      h: px(170),
      text: getText('gateBody'),
      align_h: align.CENTER_H,
      text_style: text_style.WRAP,
      text_size: px(26),
      color: C.textDim
    })

    this.stateText = createWidget(widget.TEXT, {
      x: px(73),
      y: px(306),
      w: px(320),
      h: px(42),
      text: getText('gateSearching'),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(30),
      color: C.textMuted
    })

    this.retryBtn = createWidget(widget.BUTTON, {
      x: px(113),
      y: px(354),
      w: px(240),
      h: px(68),
      text: getText('gateRetry'),
      radius: px(34),
      normal_color: C.accent,
      press_color: C.accentPressed,
      color: 0xffffff,
      text_size: px(34),
      click_func: this.retry.bind(this)
    })
  },

  onDestroy() {
    this.stateText = null
    this.retryBtn = null
  }
})
