import { createWidget, widget, prop, align, text_style } from '@zos/ui'
import { px, log } from '@zos/utils'
import { getText } from '@zos/i18n'
import { connectStatus } from '@zos/ble'
import { replace } from '@zos/router'
import { reportError } from '../utils/error-utils'

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
      this.stateText.setProperty(prop.COLOR, connected ? 0x00e000 : 0xff5500)
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
    this.stateText.setProperty(prop.COLOR, 0xaaaaaa)

    setTimeout(() => this.check(), 600)
  },

  buildGate() {
    createWidget(widget.TEXT, {
      x: 0,
      y: px(50),
      w: px(466),
      h: px(60),
      text: getText('gateTitle'),
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(56),
        color: 0xffffff,
        text_align: align.CENTER_H
      }
    })

    createWidget(widget.TEXT, {
      x: px(26),
      y: px(118),
      w: px(414),
      h: px(140),
      text: getText('gateBody'),
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(38),
        color: 0xcccccc,
        text_align: align.CENTER_H,
        line_spacing: px(10)
      }
    })

    this.stateText = createWidget(widget.TEXT, {
      x: px(26),
      y: px(268),
      w: px(414),
      h: px(44),
      text: getText('gateSearching'),
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(34),
        color: 0xaaaaaa,
        text_align: align.CENTER_H
      }
    })

    this.retryBtn = createWidget(widget.BUTTON, {
      x: px(123),
      y: px(330),
      w: px(220),
      h: px(80),
      text: getText('gateRetry'),
      radius: px(40),
      normal_color: 0x1f6feb,
      pressed_color: 0x1550b0,
      color: 0xffffff,
      text_size: px(38),
      click_func: this.retry.bind(this)
    })
  },

  onDestroy() {
    this.stateText = null
    this.retryBtn = null
  }
})
