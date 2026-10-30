import { createWidget, widget, prop, align, text_style, getTextLayout, deleteWidget } from '@zos/ui'
import { px, log } from '@zos/utils'
import { getText } from '@zos/i18n'
import { push, back } from '@zos/router'
import { getNote, removeNote, toggleImportant } from '../utils/store.js'
import { noteTitle, formatDate, parsePageParams } from '../utils/note-utils.js'
import { C } from '../utils/theme.js'
import { reportError } from '../utils/error-utils.js'

const logger = log.getLogger('zeppnotes-detail')

// Maquetacion 466x466 (area segura del circulo en la mitad inferior).
const L = {
  title: { x: 44, y: 38, w: 378, h: 50 },
  meta: { x: 44, y: 90, w: 378, h: 26 },
  body: { x: 50, y: 124, w: 366, h: 176 },
  row1: { y: 312, h: 46 },
  row2: { y: 366, h: 46 },
  btn: { x1: 92, x2: 240, w: 134 }
}

// Vista de una nota completa. Lectura y fijado, todo en local.
Page({
  state: {
    noteId: '',
    note: null,
    confirmDelete: false
  },

  onInit(params) {
    const { id } = parsePageParams(params)
    logger.log('[lifecycle] detail onInit', { id })
    this.state.noteId = typeof id === 'string' ? id : ''
    this.ui = []
    this.reload()
    this.state.confirmDelete = false
  },

  reload() {
    try {
      this.state.note = this.state.noteId ? getNote(this.state.noteId) : null
    } catch (error) {
      reportError(logger, '[notes] getNote', error)
      this.state.note = null
    }
  },

  build() {
    try {
      this.render()
    } catch (error) {
      reportError(logger, '[detail] build', error)
    }
  },

  destroyAll() {
    for (let i = this.ui.length - 1; i >= 0; i -= 1) {
      try {
        deleteWidget(this.ui[i])
      } catch (error) {
        // Ya borrado con su padre: no rompe el re-render.
      }
    }
    this.ui = []
  },

  track(w) {
    this.ui.push(w)
    return w
  },

  /** Redibujo completo: se usa al fijar/destildar una nota. */
  render() {
    this.destroyAll()
    if (!this.state.note) {
      this.buildMissing()
      return
    }
    this.buildUI()
  },

  buildMissing() {
    this.track(createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: px(466), h: px(466), color: C.bg
    }))
    this.track(createWidget(widget.TEXT, {
      x: px(50),
      y: px(180),
      w: px(366),
      h: px(100),
      text: getText('detailMissing'),
      align_h: align.CENTER_H,
      text_style: text_style.WRAP,
      line_space: px(8),
      text_size: px(30),
      color: C.textDim
    }))
    this.track(createWidget(widget.BUTTON, {
      x: px(143),
      y: px(316),
      w: px(180),
      h: px(52),
      text: getText('back'),
      radius: px(26),
      normal_color: C.surface,
      press_color: C.surfacePressed,
      color: C.text,
      text_size: px(28),
      click_func: () => back()
    }))
  },

  buildUI() {
    const note = this.state.note
    const pinned = note.important === true

    this.track(createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: px(466), h: px(466), color: C.bg
    }))

    this.track(createWidget(widget.TEXT, {
      x: px(L.title.x),
      y: px(L.title.y),
      w: px(L.title.w),
      h: px(L.title.h),
      text: noteTitle(note.content, getText('emptyNote')),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(36),
      color: pinned ? C.textWarm : C.text
    }))

    let meta = formatDate(note.updatedAt) + '  ·  ' + note.content.length + ' ' + getText('charsShort')
    if (pinned) meta += '  ·  ' + getText('pinned')

    this.track(createWidget(widget.TEXT, {
      x: px(L.meta.x),
      y: px(L.meta.y),
      w: px(L.meta.w),
      h: px(L.meta.h),
      text: meta,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(22),
      color: pinned ? C.gold : C.textDim
    }))

    const viewport = this.track(createWidget(widget.VIEW_CONTAINER, {
      x: px(L.body.x),
      y: px(L.body.y),
      w: px(L.body.w),
      h: px(L.body.h),
      scroll_enable: 1,
      pos_y: 0
    }))

    const layout = getTextLayout(note.content, {
      text_size: px(30),
      text_width: px(L.body.w),
      wrapped: 1
    })
    const contentH = Math.max(
      px(L.body.h),
      layout && layout.height ? layout.height + px(12) : px(L.body.h)
    )

    const body = viewport.createWidget(widget.TEXT, {
      x: 0,
      y: 0,
      w: px(L.body.w),
      h: px(L.body.h),
      text: note.content,
      color: C.text,
      text_size: px(30),
      text_style: text_style.WRAP
    })
    body.setProperty(prop.MORE, { text: note.content, h: contentH })
    viewport.setProperty(prop.MORE, { pos_y: 0 })
    this.ui.push(body)

    this.renderActions()
  },

  actionBtn(opts) {
    return this.track(createWidget(widget.BUTTON, Object.assign({
      w: px(L.btn.w),
      h: px(L.row1.h),
      radius: px(23),
      text_size: px(26)
    }, opts)))
  },

  renderActions() {
    const pinned = this.state.note.important === true

    this.pinBtn = this.actionBtn({
      x: px(L.btn.x1),
      y: px(L.row1.y),
      text: pinned ? getText('unpin') : getText('pin'),
      normal_color: pinned ? 0x3a3216 : C.surface,
      press_color: pinned ? 0x4a4020 : C.surfacePressed,
      color: C.gold,
      click_func: () => this.onTogglePin()
    })

    this.actionBtn({
      x: px(L.btn.x2),
      y: px(L.row1.y),
      text: getText('edit'),
      normal_color: C.accent,
      press_color: C.accentPressed,
      color: 0xffffff,
      click_func: () => this.onEdit()
    })

    this.deleteBtn = this.actionBtn({
      x: px(L.btn.x1),
      y: px(L.row2.y),
      h: px(L.row2.h),
      text: getText('delete'),
      normal_color: C.danger,
      press_color: C.dangerPressed,
      color: 0xffffff,
      click_func: () => this.onDelete()
    })

    this.actionBtn({
      x: px(L.btn.x2),
      y: px(L.row2.y),
      h: px(L.row2.h),
      text: getText('back'),
      normal_color: C.surface,
      press_color: C.surfacePressed,
      color: C.textDim,
      click_func: () => back()
    })
  },

  onTogglePin() {
    try {
      const result = toggleImportant(this.state.noteId)
      if (!result.ok) {
        if (result.reason === 'limit') logger.log('[notes] limite de fijadas', result.reason)
        return
      }
      logger.log('[notes] fijado cambiado', { id: this.state.noteId, important: result.important })
      this.reload()
      this.render()
    } catch (error) {
      reportError(logger, '[detail] togglePin', error)
    }
  },

  onEdit() {
    push({ url: 'page/editor.page', params: { id: this.state.noteId } })
  },

  onDelete() {
    // Doble toque para confirmar: evita borrados accidentales.
    if (!this.state.confirmDelete) {
      this.state.confirmDelete = true
      this.deleteBtn.setProperty(prop.MORE, {
        x: px(L.btn.x1),
        y: px(L.row2.y),
        w: px(L.btn.w),
        h: px(L.row2.h),
        text: getText('confirmDelete')
      })
      setTimeout(() => {
        this.state.confirmDelete = false
        if (this.deleteBtn) {
          this.deleteBtn.setProperty(prop.MORE, {
            x: px(L.btn.x1),
            y: px(L.row2.y),
            w: px(L.btn.w),
            h: px(L.row2.h),
            text: getText('delete')
          })
        }
      }, 3000)
      return
    }
    removeNote(this.state.noteId)
    logger.log('[notes] nota borrada', { id: this.state.noteId })
    back()
  },

  onDestroy() {
    logger.log('[lifecycle] detail onDestroy')
    this.state.note = null
    this.pinBtn = null
    this.deleteBtn = null
    this.ui = []
  }
})
