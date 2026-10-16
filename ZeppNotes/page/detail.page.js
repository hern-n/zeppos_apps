import { createWidget, widget, prop, align, text_style, getTextLayout } from '@zos/ui'
import { px, log } from '@zos/utils'
import { push, back } from '@zos/router'
import { getNote, removeNote } from '../utils/store.js'
import { noteTitle, formatDate, parsePageParams } from '../utils/note-utils.js'

const logger = log.getLogger('zeppnotes-detail')

// Vista de una nota completa. Lectura y borrado, todo en local.
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
    this.state.note = this.state.noteId ? getNote(this.state.noteId) : null
    this.state.confirmDelete = false
  },

  build() {
    try {
      if (!this.state.note) {
        this.buildMissing()
        return
      }
      this.buildUI()
    } catch (error) {
      logger.error('No se pudo construir el detalle', error)
    }
  },

  buildMissing() {
    createWidget(widget.TEXT, {
      x: px(40),
      y: px(170),
      w: px(386),
      h: px(100),
      text: 'Nota no encontrada.\nPuede que se borrara.',
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(32),
        color: 0xff7777,
        text_align: align.CENTER_H
      }
    })
    createWidget(widget.BUTTON, {
      x: px(143),
      y: px(330),
      w: px(180),
      h: px(64),
      text: 'Atrás',
      radius: px(32),
      normal_color: 0x2d2d34,
      pressed_color: 0x48484f,
      color: 0xffffff,
      text_size: px(30),
      click_func: () => back()
    })
  },

  buildUI() {
    const note = this.state.note

    createWidget(widget.TEXT, {
      x: px(40),
      y: px(24),
      w: px(386),
      h: px(44),
      text: noteTitle(note.content),
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(36),
        color: 0xffffff,
        text_align: align.CENTER_H
      }
    })

    createWidget(widget.TEXT, {
      x: px(40),
      y: px(66),
      w: px(386),
      h: px(28),
      text: formatDate(note.updatedAt) + ' · ' + note.content.length + ' car.',
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(24),
        color: 0x888888,
        text_align: align.CENTER_H
      }
    })

    const viewport = createWidget(widget.VIEW_CONTAINER, {
      x: px(30),
      y: px(100),
      w: px(406),
      h: px(230),
      scroll_enable: 1,
      pos_y: 0
    })

    const layout = getTextLayout(note.content, {
      text_size: px(30),
      text_width: px(406),
      wrapped: 1
    })
    const contentH = Math.max(
      px(230),
      layout && layout.height ? layout.height + px(12) : px(230)
    )

    const body = viewport.createWidget(widget.TEXT, {
      x: 0,
      y: 0,
      w: px(406),
      h: px(230),
      text: note.content,
      color: 0xffffff,
      text_size: px(30),
      text_style: text_style.WRAP
    })
    body.setProperty(prop.MORE, { text: note.content, h: contentH })
    viewport.setProperty(prop.MORE, {
      pos_y: 0
    })

    this.editBtn = createWidget(widget.BUTTON, {
      x: px(63),
      y: px(340),
      w: px(160),
      h: px(58),
      text: 'Editar',
      radius: px(29),
      normal_color: 0x1f6feb,
      pressed_color: 0x1550b0,
      color: 0xffffff,
      text_size: px(28),
      click_func: () => this.onEdit()
    })

    this.deleteBtn = createWidget(widget.BUTTON, {
      x: px(243),
      y: px(340),
      w: px(160),
      h: px(58),
      text: 'Borrar',
      radius: px(29),
      normal_color: 0x5a2020,
      pressed_color: 0x7a2a2a,
      color: 0xffffff,
      text_size: px(28),
      click_func: () => this.onDelete()
    })

    createWidget(widget.BUTTON, {
      x: px(163),
      y: px(404),
      w: px(140),
      h: px(48),
      text: 'Atrás',
      radius: px(24),
      normal_color: 0x2d2d34,
      pressed_color: 0x48484f,
      color: 0xffffff,
      text_size: px(26),
      click_func: () => back()
    })
  },

  onEdit() {
    push({ url: 'page/editor.page', params: { id: this.state.noteId } })
  },

  onDelete() {
    // Doble toque para confirmar: evita borrados accidentales.
    if (!this.state.confirmDelete) {
      this.state.confirmDelete = true
      this.deleteBtn.setProperty(prop.MORE, { text: '¿Seguro?' })
      setTimeout(() => {
        this.state.confirmDelete = false
        if (this.deleteBtn) this.deleteBtn.setProperty(prop.MORE, { text: 'Borrar' })
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
    this.editBtn = null
    this.deleteBtn = null
  }
})
