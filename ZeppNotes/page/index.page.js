import { createWidget, widget, prop, align, text_style } from '@zos/ui'
import { px, log } from '@zos/utils'
import { push } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_SHORT_LIGHT } from '@zos/sensor'
import { MAX_NOTES } from '../utils/constants.js'
import { loadNotes } from '../utils/store.js'
import { noteTitle, formatDate } from '../utils/note-utils.js'

const logger = log.getLogger('zeppnotes-list')

// Lista de notas. Todo local: no usa BLE ni el movil en ningun sentido.
Page({
  state: {
    notes: []
  },

  onInit() {
    logger.log('[lifecycle] list onInit')
    this.state.notes = loadNotes()
  },

  build() {
    logger.log('[lifecycle] list build', { count: this.state.notes.length })
    try {
      this.buildUI()
    } catch (error) {
      logger.error('No se pudo construir la lista', error)
      createWidget(widget.TEXT, {
        x: px(20),
        y: px(188),
        w: px(426),
        h: px(90),
        text: 'Error al abrir las notas. Cierra y vuelve a abrir.',
        color: 0xff6666,
        text_size: px(30),
        align_h: align.CENTER_H,
        text_style: text_style.NONE
      })
    }
  },

  buildUI() {
    const notes = this.state.notes

    createWidget(widget.TEXT, {
      x: 0,
      y: px(24),
      w: px(466),
      h: px(48),
      text: 'Notas (' + notes.length + '/' + MAX_NOTES + ')',
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(40),
        color: 0xffffff,
        text_align: align.CENTER_H
      }
    })

    if (notes.length === 0) {
      createWidget(widget.TEXT, {
        x: px(40),
        y: px(170),
        w: px(386),
        h: px(120),
        text: 'Sin notas.\nToca "+ Nueva" para crear la primera.',
        align_h: align.CENTER_H,
        text_style: {
          text_size: px(32),
          color: 0x888888,
          text_align: align.CENTER_H,
          line_spacing: px(8)
        }
      })
    } else {
      this.buildList(notes)
    }

    const full = notes.length >= MAX_NOTES
    createWidget(widget.BUTTON, {
      x: px(133),
      y: px(382),
      w: px(200),
      h: px(64),
      text: full ? 'Límite 20/20' : '+ Nueva',
      radius: px(32),
      normal_color: full ? 0x3a3a42 : 0x1f6feb,
      pressed_color: full ? 0x3a3a42 : 0x1550b0,
      color: full ? 0x888888 : 0xffffff,
      text_size: px(32),
      click_func: () => this.onNew()
    })
  },

  buildList(notes) {
    const itemH = px(72)
    const gap = px(10)
    const contentH = notes.length * (itemH + gap)

    const viewport = createWidget(widget.VIEW_CONTAINER, {
      x: px(30),
      y: px(80),
      w: px(406),
      h: px(292),
      scroll_enable: 1,
      pos_y: 0
    })

    notes.forEach((note, i) => {
      viewport.createWidget(widget.BUTTON, {
        x: 0,
        y: i * (itemH + gap),
        w: px(406),
        h: itemH,
        text: noteTitle(note.content) + '\n' + formatDate(note.updatedAt),
        radius: px(18),
        normal_color: 0x2d2d34,
        pressed_color: 0x48484f,
        color: 0xffffff,
        text_size: px(26),
        click_func: () => this.openNote(note.id)
      })
    })

    // Altura real del contenido para que el scroll llegue al final.
    if (contentH > px(292)) {
      viewport.setProperty(prop.MORE, { h: px(292) })
    }
  },

  openNote(id) {
    new Vibrator().start({ mode: VIBRATOR_SCENE_SHORT_LIGHT })
    push({ url: 'page/detail.page', params: { id } })
  },

  onNew() {
    if (this.state.notes.length >= MAX_NOTES) return
    new Vibrator().start({ mode: VIBRATOR_SCENE_SHORT_LIGHT })
    push({ url: 'page/editor.page', params: { id: '' } })
  },

  onDestroy() {
    logger.log('[lifecycle] list onDestroy')
    this.state.notes = []
  }
})
