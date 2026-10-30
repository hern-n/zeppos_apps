import { createWidget, widget, align, text_style, deleteWidget, event } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import { px, log } from '@zos/utils'
import { loadNotes } from '../utils/store.js'
import { selectNotes, noteTitle, formatDate, importantCount } from '../utils/note-utils.js'
import { WIDGET_NOTES, MAX_NOTES } from '../utils/constants.js'
import { C, IMG } from '../utils/theme.js'
import { reportError } from '../utils/error-utils.js'

const logger = log.getLogger('zeppnotes-widget')

// Widget a pantalla completa (466x466): 3 notas, fijadas primero.
// Solo responde a clics; cualquier toque abre la app.
const L = {
  title: { x: 83, y: 40, w: 300, h: 48 },
  subtitle: { x: 83, y: 88, w: 300, h: 26 },
  card: { x: 72, w: 322, h: 84, top: 116, gap: 12 },
  empty: { x: 70, y: 176, w: 326, h: 120 }
}

SecondaryWidget({
  state: {
    notes: [],
    total: 0,
    signature: ''
  },

  onInit() {
    logger.log('[lifecycle] widget onInit')
    this.ui = []
    try {
      const all = loadNotes()
      this.state.total = all.length
      this.state.notes = selectNotes(all, WIDGET_NOTES)
    } catch (error) {
      reportError(logger, '[notes] widget loadNotes', error)
      this.state.notes = []
      this.state.total = 0
    }
  },

  build() {
    logger.log('[lifecycle] widget build', { count: this.state.notes.length })
    try {
      this.draw()
      this.state.signature = this.sign()
    } catch (error) {
      reportError(logger, '[widget] build', error)
    }
  },

  onResume() {
    try {
      const all = loadNotes()
      this.state.total = all.length
      this.state.notes = selectNotes(all, WIDGET_NOTES)
      const signature = this.sign()
      if (signature !== this.state.signature) {
        this.state.signature = signature
        this.draw()
      }
    } catch (error) {
      reportError(logger, '[widget] onResume', error)
    }
  },

  sign() {
    return this.state.total + '#' + this.state.notes
      .map((n) => n.id + ':' + n.updatedAt + ':' + (n.important ? 1 : 0))
      .join('|')
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

  draw() {
    this.destroyAll()

    const bg = this.track(createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(466),
      h: px(466),
      color: C.bg
    }))
    bg.addEventListener(event.CLICK_DOWN, () => this.open())

    const title = this.track(createWidget(widget.TEXT, {
      x: px(L.title.x),
      y: px(L.title.y),
      w: px(L.title.w),
      h: px(L.title.h),
      text: getText('notesTitle'),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(40),
      color: C.text
    }))
    title.addEventListener(event.CLICK_DOWN, () => this.open())

    const notes = this.state.notes
    const total = this.state.total
    const pinned = importantCount(notes)

    let subtitle = total + '/' + MAX_NOTES + ' ' + getText('notesUnit')
    if (pinned > 0) subtitle += '  ·  ' + pinned + ' ' + getText('pinned')

    const sub = this.track(createWidget(widget.TEXT, {
      x: px(L.subtitle.x),
      y: px(L.subtitle.y),
      w: px(L.subtitle.w),
      h: px(L.subtitle.h),
      text: subtitle,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(22),
      color: C.textDim
    }))
    sub.addEventListener(event.CLICK_DOWN, () => this.open())

    if (notes.length === 0) {
      const empty = this.track(createWidget(widget.TEXT, {
        x: px(L.empty.x),
        y: px(L.empty.y),
        w: px(L.empty.w),
        h: px(L.empty.h),
        text: getText('widgetEmpty') + '\n' + getText('widgetHint'),
        align_h: align.CENTER_H,
        text_style: text_style.WRAP,
        line_space: px(10),
        text_size: px(30),
        color: C.textMuted
      }))
      empty.addEventListener(event.CLICK_DOWN, () => this.open())
      return
    }

    notes.forEach((note, i) => this.drawCard(note, i))
  },

  drawCard(note, index) {
    const y = L.card.top + index * (L.card.h + L.card.gap)
    const pinned = note.important === true

    this.track(createWidget(widget.BUTTON, {
      x: px(L.card.x),
      y: px(y),
      w: px(L.card.w),
      h: px(L.card.h),
      text: '',
      radius: px(18),
      normal_color: pinned ? C.surfaceWarm : C.surface,
      press_color: pinned ? C.surfaceWarmPressed : C.surfacePressed,
      click_func: () => this.open()
    }))

    if (pinned) {
      this.track(createWidget(widget.FILL_RECT, {
        x: px(L.card.x + 10),
        y: y + px(18),
        w: px(5),
        h: px(48),
        radius: px(3),
        color: C.gold
      }))
    }

    const title = this.track(createWidget(widget.TEXT, {
      x: px(L.card.x + 24),
      y: y + px(16),
      w: px(L.card.w - 24 - 66),
      h: px(34),
      text: noteTitle(note.content, getText('emptyNote')),
      text_style: text_style.ELLIPSIS,
      text_size: px(28),
      color: pinned ? C.textWarm : C.text
    }))
    title.addEventListener(event.CLICK_DOWN, () => this.open())

    const date = this.track(createWidget(widget.TEXT, {
      x: px(L.card.x + 24),
      y: y + px(50),
      w: px(L.card.w - 24 - 66),
      h: px(24),
      text: formatDate(note.updatedAt),
      text_style: text_style.ELLIPSIS,
      text_size: px(21),
      color: C.textDim
    }))
    date.addEventListener(event.CLICK_DOWN, () => this.open())

    if (pinned) {
      const star = this.track(createWidget(widget.IMG, {
        x: px(L.card.x + L.card.w - 48 - 14),
        y: y + px(18),
        src: IMG.starOn
      }))
      star.addEventListener(event.CLICK_DOWN, () => this.open())
    }
  }
})
