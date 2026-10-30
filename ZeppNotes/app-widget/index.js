import { createWidget, widget, align, text_style, deleteWidget, event, getAppWidgetSize, setAppWidgetSize } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import { px, log } from '@zos/utils'
import { loadNotes } from '../utils/store.js'
import { selectNotes, noteTitle, formatDate, importantCount } from '../utils/note-utils.js'
import { CARD_NOTES, MAX_NOTES } from '../utils/constants.js'
import { C, IMG } from '../utils/theme.js'
import { reportError } from '../utils/error-utils.js'

const logger = log.getLogger('zeppnotes-card')

// Shortcut Card de la pantalla negativa: 2 notas (fijadas primero).
// Coordenadas relativas a la esquina superior izquierda de la tarjeta.
const L = {
  h: 180,
  header: { x: 16, y: 12, h: 24, w: 210 },
  row: { x: 16, top: 44, h: 56, gap: 8, pad: 16 },
  empty: { y: 70, h: 40 }
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
    this.cardRadius = px(20)
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
      // Altura de la tarjeta (20%-60% de la pantalla); ancho y radio del sistema.
      setAppWidgetSize({ h: px(L.h) })
      const size = getAppWidgetSize()
      if (size) {
        if (size.w) this.cardW = size.w
        if (size.radius) this.cardRadius = size.radius
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

  draw() {
    this.destroyAll()

    const w = this.cardW
    const rowW = w - L.row.x - L.row.pad

    this.clickable(this.track(createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w,
      h: px(L.h),
      radius: this.cardRadius,
      color: C.surface
    })))

    this.clickable(this.track(createWidget(widget.TEXT, {
      x: px(L.header.x),
      y: px(L.header.y),
      w: px(L.header.w),
      h: px(L.header.h),
      text: getText('notesTitle'),
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(22),
      color: C.textDim
    })))

    this.clickable(this.track(createWidget(widget.TEXT, {
      x: w - px(L.header.x) - px(L.header.w),
      y: px(L.header.y),
      w: px(L.header.w),
      h: px(L.header.h),
      text: this.state.total + '/' + MAX_NOTES,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(22),
      color: C.textMuted
    })))

    const notes = this.state.notes
    if (notes.length === 0) {
      this.clickable(this.track(createWidget(widget.TEXT, {
        x: px(L.row.x),
        y: px(L.empty.y),
        w: rowW,
        h: px(L.empty.h),
        text: getText('widgetEmpty'),
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text_size: px(26),
        color: C.textMuted
      })))
      return
    }

    notes.forEach((note, i) => this.drawRow(note, i, rowW))
  },

  drawRow(note, index, rowW) {
    const y = L.row.top + index * (L.row.h + L.row.gap)
    const pinned = note.important === true

    this.clickable(this.track(createWidget(widget.BUTTON, {
      x: px(L.row.x),
      y: px(y),
      w: rowW,
      h: px(L.row.h),
      text: '',
      radius: px(14),
      normal_color: pinned ? C.surfaceWarm : 0x1e2430,
      press_color: pinned ? C.surfaceWarmPressed : C.surfacePressed
    })))

    if (pinned) {
      this.track(createWidget(widget.FILL_RECT, {
        x: px(L.row.x + 8),
        y: y + px(14),
        w: px(5),
        h: px(28),
        radius: px(3),
        color: C.gold
      }))
    }

    this.clickable(this.track(createWidget(widget.TEXT, {
      x: px(L.row.x + 18),
      y: y + px(6),
      w: rowW - px(18) - px(56),
      h: px(28),
      text: noteTitle(note.content, getText('emptyNote')),
      text_style: text_style.ELLIPSIS,
      text_size: px(26),
      color: pinned ? C.textWarm : C.text
    })))

    this.clickable(this.track(createWidget(widget.TEXT, {
      x: px(L.row.x + 18),
      y: y + px(34),
      w: rowW - px(18) - px(56),
      h: px(20),
      text: formatDate(note.updatedAt),
      text_style: text_style.ELLIPSIS,
      text_size: px(20),
      color: C.textDim
    })))

    if (pinned) {
      this.clickable(this.track(createWidget(widget.IMG, {
        x: px(L.row.x) + rowW - px(48) - px(6),
        y: y + px(4),
        src: IMG.starOn
      })))
    }
  }
})
