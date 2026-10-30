import { createWidget, widget, align, text_style, deleteWidget, event, getAppWidgetSize } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import { px, log } from '@zos/utils'
import { loadNotes } from '../utils/store.js'
import { selectNotes, noteTitle } from '../utils/note-utils.js'
import { CARD_NOTES, MAX_NOTES } from '../utils/constants.js'
import { C, IMG } from '../utils/theme.js'
import { reportError } from '../utils/error-utils.js'

const logger = log.getLogger('zeppnotes-card')

// Shortcut Card de la pantalla negativa: 2 notas, solo el titulo (sin
// fecha) para que el texto pueda ir mas grande.
//
// Dos decisiones de maquetacion:
//  - No se dibuja fondo propio: el marco lo pone el sistema, asi la
//    tarjeta queda identica al resto de la pantalla negativa.
//  - No se fuerza la altura (sin setAppWidgetSize): se usa la que
//    devuelve getAppWidgetSize() y las filas se estiran para repartir el
//    hueco con margen interior de 16px por arriba y por abajo.
const L = {
  pad: 16,
  headerH: 28,
  headerGap: 12,
  rowGap: 10,
  rowMin: 44,
  rowMax: 84,
  titleSize: 34,
  headerSize: 24
}

AppWidget({
  state: {
    notes: [],
    total: 0,
    signature: ''
  },

  onInit() {
    logger.log('[lifecycle] card onInit')
    this.ui = []
    this.cardW = px(466)
    this.cardH = px(233)
    this.sync()
  },

  sync() {
    try {
      const all = loadNotes()
      this.state.total = all.length
      this.state.notes = selectNotes(all, CARD_NOTES)
    } catch (error) {
      reportError(logger, '[notes] card loadNotes', error)
      this.state.notes = []
      this.state.total = 0
    }
  },

  sign() {
    return this.state.total + '#' + this.state.notes
      .map((n) => n.id + ':' + n.updatedAt + ':' + (n.important ? 1 : 0))
      .join('|')
  },

  build() {
    logger.log('[lifecycle] card build')
    try {
      const size = getAppWidgetSize()
      if (size) {
        if (size.w) this.cardW = size.w
        if (size.h) this.cardH = size.h
      }
      this.draw()
      this.state.signature = this.sign()
    } catch (error) {
      reportError(logger, '[card] build', error)
    }
  },

  onResume() {
    try {
      this.sync()
      const signature = this.sign()
      if (signature !== this.state.signature) {
        this.state.signature = signature
        this.draw()
      }
    } catch (error) {
      reportError(logger, '[card] onResume', error)
    }
  },

  destroyAll() {
    for (let i = this.ui.length - 1; i >= 0; i -= 1) {
      try {
        deleteWidget(this.ui[i])
      } catch (error) {
        // Ya borrado con su padre.
      }
    }
    this.ui = []
  },

  track(w) {
    this.ui.push(w)
    return w
  },

  open() {
    push({ url: 'page/index.page' })
  },

  clickable(w) {
    w.addEventListener(event.CLICK_DOWN, () => this.open())
    return w
  },

  /** Alto de fila para repartir el hueco sobrante con margen de 16px. */
  rowHeight() {
    const pxPad = px(L.pad)
    const free = this.cardH - pxPad * 2 - px(L.headerH) - px(L.headerGap) - px(L.rowGap)
    const half = Math.floor(free / 2)
    return Math.max(px(L.rowMin), Math.min(px(L.rowMax), half))
  },

  draw() {
    this.destroyAll()

    const W = this.cardW
    const pad = px(L.pad)
    const rowW = W - pad * 2
    const rowH = this.rowHeight()
    const row1Y = pad + px(L.headerH) + px(L.headerGap)
    const row2Y = row1Y + rowH + px(L.rowGap)

    // Cabecera: nombre a la izquierda, contador a la derecha, alineados
    // con los bordes de las filas.
    this.clickable(this.track(createWidget(widget.TEXT, {
      x: pad,
      y: pad,
      w: Math.floor(rowW / 2),
      h: px(L.headerH),
      text: getText('notesTitle'),
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(L.headerSize),
      color: C.textDim
    })))

    this.clickable(this.track(createWidget(widget.TEXT, {
      x: pad + Math.floor(rowW / 2),
      y: pad,
      w: Math.ceil(rowW / 2),
      h: px(L.headerH),
      text: this.state.total + '/' + MAX_NOTES,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(L.headerSize),
      color: C.textMuted
    })))

    const notes = this.state.notes
    if (notes.length === 0) {
      this.clickable(this.track(createWidget(widget.TEXT, {
        x: pad,
        y: row1Y,
        w: rowW,
        h: rowH * 2 + px(L.rowGap),
        text: getText('widgetEmpty'),
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text_size: px(30),
        color: C.textMuted
      })))
      return
    }

    notes.forEach((note, i) => {
      this.drawRow(note, i === 0 ? row1Y : row2Y, rowW, rowH)
    })
  },

  drawRow(note, y, rowW, rowH) {
    const pad = px(L.pad)
    const pinned = note.important === true

    this.clickable(this.track(createWidget(widget.BUTTON, {
      x: pad,
      y,
      w: rowW,
      h: rowH,
      text: '',
      radius: px(16),
      normal_color: pinned ? C.surfaceWarm : C.surface,
      press_color: pinned ? C.surfaceWarmPressed : C.surfacePressed
    })))

    const starW = pinned ? px(48) + px(10) : 0

    this.clickable(this.track(createWidget(widget.TEXT, {
      x: pad + px(18),
      y,
      w: rowW - px(18) - starW - px(14),
      h: rowH,
      text: noteTitle(note.content, getText('emptyNote')),
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(L.titleSize),
      color: pinned ? C.textWarm : C.text
    })))

    if (pinned) {
      this.clickable(this.track(createWidget(widget.IMG, {
        x: pad + rowW - px(48) - px(10),
        y: y + Math.floor((rowH - px(48)) / 2),
        src: IMG.starOn
      })))
    }
  }
})
