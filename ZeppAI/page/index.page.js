import { createWidget, widget, prop, align, text_style } from '@zos/ui'
import { px, log } from '@zos/utils'
import { connectStatus } from '@zos/ble'
import { replace } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_SHORT_LIGHT } from '@zos/sensor'

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
    this.buildGate()
    this.check()
  },

  check() {
    const connected = connectStatus()
    logger.log('[ble] connectStatus', connected)

    if (this.stateText) {
      this.stateText.setProperty(prop.TEXT, connected ? 'Conectado' : 'Sin conexion')
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
    const vibrator = new Vibrator()
    vibrator.start({ mode: VIBRATOR_SCENE_SHORT_LIGHT })

    this.stateText.setProperty(prop.TEXT, 'Buscando...')
    this.stateText.setProperty(prop.COLOR, 0xaaaaaa)

    setTimeout(() => this.check(), 600)
  },

  buildGate() {
    createWidget(widget.TEXT, {
      x: 0,
      y: px(50),
      w: px(466),
      h: px(60),
      text: 'ZeppAI',
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
      text: 'Conecta el movil\npara poder usar la IA.\n\nSin conexion, la app\nno funciona.',
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
      text: 'Buscando...',
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
      text: 'Reintentar',
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
