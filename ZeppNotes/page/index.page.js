import { createWidget, widget, prop, align, text_style, deleteWidget, event } from '@zos/ui'
import { px, log } from '@zos/utils'
import { getText } from '@zos/i18n'
import { push } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_SHORT_LIGHT } from '@zos/sensor'
import { MAX_NOTES } from '../utils/constants.js'
import { loadNotes, toggleImportant } from '../utils/store.js'
import { noteTitle, formatDate, importantCount } from '../utils/note-utils.js'
import { C, IMG } from '../utils/theme.js'
import { reportError } from '../utils/error-utils.js'

const logger = log.getLogger('zeppnotes-list')

// Maquetacion 466x466: todo centrado y dentro del area segura del circulo.
const L = {
  title: { x: 83, y: 40, w: 300, h: 54 },
  subtitle: { x: 83, y: 94, w: 300, h: 28 },
  view: { x: 44, y: 136, w: 378, h: 220 },
  rowH: 68,
  rowGap: 8,
  rowW: 378,
  star: 48,
  fab: { x: 197, y: 364, w: 72, h: 72 },
  limit: { x: 143, y: 370, w: 180, h: 56 },
  empty: { x: 70, y: 190, w: 326, h: 120 }
}

// Lista de notas. Todo local: no usa BLE ni el movil en ningun sentido.
Page({
  state: {
    notes: [],
    signature: ''
  },

  onInit() {
    logger.log('[lifecycle] list onInit')
    this.rowWidgets = []
    this.ctaWidgets = []
    this.flashTimer = null
    try {
      this.state.notes = loadNotes()
    } catch (error) {
      reportError(logger, '[notes] loadNotes', error)
      this.state.notes = []
    }
  },

  build() {
    logger.log('[lifecycle] list build', { count: this.state.notes.length })
    try {
      this.buildUI()
      this.state.signature = this.sign()
    } catch (error) {
      reportError(logger, '[list] build', error)
      createWidget(widget.TEXT, {
        x: px(20),
        y: px(188),
        w: px(426),
        h: px(90),
        text: getText('listError'),
        color: 0xff6666,
        text_size: px(30),
        align_h: align.CENTER_H,
        text_style: text_style.NONE
      })
    }
  },

  // Volver de detalle/editor: se relee del store si algo ha cambiado.
  onResume() {
    try {
      const notes = loadNotes()
      this.state.notes = notes
      if (this.sign() !== this.state.signature) {
        this.state.signature = this.sign()
        this.renderRows()
        this.renderCta()
        this.updateHeader()
      }
    } catch (error) {
      reportError(logger, '[list] onResume', error)
    }
  },

  sign() {
    return this.state.notes
      .map((n) => n.id + ':' + n.updatedAt + ':' + (n.important ? 1 : 0))
      .join('|')
  },

  destroyAll(list) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      try {
        deleteWidget(list[i])
      } catch (error) {
        // Un hijo ya borrado con su padre no debe romper el render.
      }
    }
  },

  track(target, w) {
    target.push(w)
    return w
  },

  buildUI() {
    createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(466),
      h: px(466),
      color: C.bg
    })

    createWidget(widget.TEXT, {
      x: px(L.title.x),
      y: px(L.title.y),
      w: px(L.title.w),
      h: px(L.title.h),
      text: getText('notesTitle'),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(44),
      color: C.text
    })

    this.subtitle = createWidget(widget.TEXT, {
      x: px(L.subtitle.x),
      y: px(L.subtitle.y),
      w: px(L.subtitle.w),
      h: px(L.subtitle.h),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(24),
      color: C.textDim
    })

    this.updateHeader()
    this.renderRows()
    this.renderCta()
  },

  updateHeader() {
    if (!this.subtitle) return
    const notes = this.state.notes
    const pinned = importantCount(notes)
    let text = notes.length + '/' + MAX_NOTES + ' ' + getText('notesUnit')
    if (pinned > 0) text += '  ·  ' + pinned + ' ' + getText('pinned')
    this.subtitle.setProperty(prop.TEXT, text)
    this.subtitle.setProperty(prop.COLOR, C.textDim)
  },

  /** Aviso breve en la linea de subtitulo (limite de fijadas, etc.). */
  flash(message) {
    if (!this.subtitle) return
    this.subtitle.setProperty(prop.TEXT, message)
    this.subtitle.setProperty(prop.COLOR, C.gold)
    if (this.flashTimer) clearTimeout(this.flashTimer)
    this.flashTimer = setTimeout(() => {
      this.flashTimer = null
      this.updateHeader()
    }, 1800)
  },

  renderRows() {
    this.destroyAll(this.rowWidgets)
    this.rowWidgets = []

    const notes = this.state.notes
    if (notes.length === 0) {
      this.track(this.rowWidgets, createWidget(widget.TEXT, {
        x: px(L.empty.x),
        y: px(L.empty.y),
        w: px(L.empty.w),
        h: px(L.empty.h),
        text: getText('notesEmpty'),
        align_h: align.CENTER_H,
        text_style: text_style.WRAP,
        line_space: px(10),
        text_size: px(30),
        color: C.textMuted
      }))
      return
    }

    const viewport = this.track(this.rowWidgets, createWidget(widget.VIEW_CONTAINER, {
      x: px(L.view.x),
      y: px(L.view.y),
      w: px(L.view.w),
      h: px(L.view.h),
      scroll_enable: 1,
      pos_y: 0
    }))

    notes.forEach((note, i) => {
      const y = i * (L.rowH + L.rowGap)
      const pinned = note.important === true
      this.track(this.rowWidgets, viewport.createWidget(widget.BUTTON, {
        x: 0,
        y,
        w: px(L.rowW),
        h: px(L.rowH),
        text: '',
        radius: px(16),
        normal_color: pinned ? C.surfaceWarm : C.surface,
        press_color: pinned ? C.surfaceWarmPressed : C.surfacePressed,
        click_func: () => this.openNote(note.id)
      }))

      if (pinned) {
        this.track(this.rowWidgets, viewport.createWidget(widget.FILL_RECT, {
          x: px(6),
          y: y + px(16),
          w: px(5),
          h: px(36),
          radius: px(3),
          color: C.gold
        }))
      }

      const title = this.track(this.rowWidgets, viewport.createWidget(widget.TEXT, {
        x: px(18),
        y: y + px(10),
        w: px(L.rowW - 90),
        h: px(32),
        text: noteTitle(note.content, getText('emptyNote')),
        text_style: text_style.ELLIPSIS,
        text_size: px(28),
        color: pinned ? C.textWarm : C.text
      }))
      title.addEventListener(event.CLICK_DOWN, () => this.openNote(note.id))

      const date = this.track(this.rowWidgets, viewport.createWidget(widget.TEXT, {
        x: px(18),
        y: y + px(42),
        w: px(L.rowW - 90),
        h: px(22),
        text: formatDate(note.updatedAt),
        text_style: text_style.ELLIPSIS,
        text_size: px(21),
        color: C.textDim
      }))
      date.addEventListener(event.CLICK_DOWN, () => this.openNote(note.id))

      // Estrella: fija/destilda. Con 3 fijadas el store devuelve 'limit'.
      this.track(this.rowWidgets, viewport.createWidget(widget.BUTTON, {
        x: px(L.rowW - L.star - 12),
        y: y + px(10),
        w: px(L.star),
        h: px(L.star),
        normal_src: pinned ? IMG.starOn : IMG.starOff,
        press_src: pinned ? IMG.starOn : IMG.starOff,
        click_func: () => this.togglePin(note.id)
      }))
    })
  },

  renderCta() {
    this.destroyAll(this.ctaWidgets)
    this.ctaWidgets = []

    if (this.state.notes.length >= MAX_NOTES) {
      this.track(this.ctaWidgets, createWidget(widget.BUTTON, {
        x: px(L.limit.x),
        y: px(L.limit.y),
        w: px(L.limit.w),
        h: px(L.limit.h),
        text: getText('limitFull'),
        radius: px(24),
        normal_color: C.surface,
        press_color: C.surfacePressed,
        color: C.textMuted,
        text_size: px(26),
        click_func: () => this.flash(getText('limitFull'))
      }))
      return
    }

    this.track(this.ctaWidgets, createWidget(widget.BUTTON, {
      x: px(L.fab.x),
      y: px(L.fab.y),
      w: px(L.fab.w),
      h: px(L.fab.h),
      normal_src: IMG.fab,
      press_src: IMG.fabPress,
      click_func: () => this.onNew()
    }))
  },

  togglePin(id) {
    try {
      const result = toggleImportant(id)
      if (!result.ok) {
        if (result.reason === 'limit') this.flash(getText('pinLimit'))
        return
      }
      new Vibrator().start({ mode: VIBRATOR_SCENE_SHORT_LIGHT })
      this.state.notes = result.notes
      this.state.signature = this.sign()
      logger.log('[notes] nota fijada/destilada', { id, important: result.important })
      this.renderRows()
      this.updateHeader()
    } catch (error) {
      reportError(logger, '[list] togglePin', error)
    }
  },

  openNote(id) {
    push({ url: 'page/detail.page', params: { id } })
  },

  onNew() {
    if (this.state.notes.length >= MAX_NOTES) return
    push({ url: 'page/editor.page', params: { id: '' } })
  },

  onDestroy() {
    logger.log('[lifecycle] list onDestroy')
    if (this.flashTimer) {
      clearTimeout(this.flashTimer)
      this.flashTimer = null
    }
    this.state.notes = []
    this.rowWidgets = []
    this.ctaWidgets = []
  }
})
