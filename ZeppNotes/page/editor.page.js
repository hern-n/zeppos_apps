import {
  createWidget, widget, prop, align, text_style,
  createKeyboard, deleteKeyboard, inputType, keyboard,
  getTextLayout
} from '@zos/ui'
import { px, log } from '@zos/utils'
import { back } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_SHORT_LIGHT, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { MAX_CHARS, MAX_NOTES } from '../utils/constants.js'
import { loadNotes, getNote, upsertNote } from '../utils/store.js'
import { clampContent, createNote, parsePageParams } from '../utils/note-utils.js'

const logger = log.getLogger('zeppnotes-editor')

// Editor de notas. Escribir con teclado es 100% local (CHAR/NUM).
// Solo el boton "Dictar" (inputType.VOICE) puede usar el movil/voz del
// sistema; el guardado siempre es local en el reloj.
Page({
  state: {
    noteId: '',
    isNew: true,
    draft: '',
    kbMode: 'CHAR',
    error: ''
  },

  onInit(params) {
    const { id } = parsePageParams(params)
    const noteId = typeof id === 'string' ? id : ''
    logger.log('[lifecycle] editor onInit', { noteId })
    this.state.noteId = noteId
    this.state.isNew = !noteId
    const existing = noteId ? getNote(noteId) : null
    this.state.draft = existing ? existing.content : ''
    this.state.kbMode = 'CHAR'
    this.state.error = ''
    this.keyboardTimer = null
  },

  updateState(patch) {
    Object.assign(this.state, patch)
  },

  build() {
    try {
      this.buildUI()
      this.renderDraft()
    } catch (error) {
      logger.error('No se pudo construir el editor', error)
    }
  },

  buildUI() {
    createWidget(widget.TEXT, {
      x: 0,
      y: px(20),
      w: px(466),
      h: px(44),
      text: this.state.isNew ? 'Nueva nota' : 'Editar nota',
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(38),
        color: 0xffffff,
        text_align: align.CENTER_H
      }
    })

    this.counterText = createWidget(widget.TEXT, {
      x: 0,
      y: px(62),
      w: px(466),
      h: px(28),
      text: '',
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(24),
        color: 0x888888,
        text_align: align.CENTER_H
      }
    })

    this.viewport = createWidget(widget.VIEW_CONTAINER, {
      x: px(30),
      y: px(94),
      w: px(406),
      h: px(196),
      scroll_enable: 1,
      pos_y: 0
    })

    this.draftText = this.viewport.createWidget(widget.TEXT, {
      x: 0,
      y: 0,
      w: px(406),
      h: px(196),
      text: '',
      color: 0xffffff,
      text_size: px(30),
      text_style: text_style.WRAP
    })

    this.errorText = createWidget(widget.TEXT, {
      x: px(40),
      y: px(292),
      w: px(386),
      h: px(30),
      text: '',
      align_h: align.CENTER_H,
      text_style: {
        text_size: px(24),
        color: 0xff7777,
        text_align: align.CENTER_H
      }
    })

    // Fila 1: Escribir (local) + Dictar (voz del sistema).
    createWidget(widget.BUTTON, {
      x: px(63),
      y: px(324),
      w: px(160),
      h: px(56),
      text: 'Escribir',
      radius: px(28),
      normal_color: 0x2d2d34,
      pressed_color: 0x48484f,
      color: 0xffffff,
      text_size: px(26),
      click_func: () => this.openKeyboard(false)
    })

    createWidget(widget.BUTTON, {
      x: px(243),
      y: px(324),
      w: px(160),
      h: px(56),
      text: 'Dictar',
      radius: px(28),
      normal_color: 0x2d2d34,
      pressed_color: 0x48484f,
      color: 0xffffff,
      text_size: px(26),
      click_func: () => this.openKeyboard(true)
    })

    // Fila 2: Guardar (local) + Cancelar.
    createWidget(widget.BUTTON, {
      x: px(63),
      y: px(388),
      w: px(160),
      h: px(56),
      text: 'Guardar',
      radius: px(28),
      normal_color: 0x1f6feb,
      pressed_color: 0x1550b0,
      color: 0xffffff,
      text_size: px(28),
      click_func: () => this.save()
    })

    createWidget(widget.BUTTON, {
      x: px(243),
      y: px(388),
      w: px(160),
      h: px(56),
      text: 'Cancelar',
      radius: px(28),
      normal_color: 0x2d2d34,
      pressed_color: 0x48484f,
      color: 0xffffff,
      text_size: px(28),
      click_func: () => this.cancel()
    })
  },

  renderDraft() {
    const draft = this.state.draft || ''
    const preview = draft || 'Toca "Escribir" o "Dictar" para añadir texto.'
    const baseH = px(196)

    const layout = getTextLayout(preview, {
      text_size: px(30),
      text_width: px(406),
      wrapped: 1
    })
    const contentH = Math.max(
      baseH,
      layout && layout.height ? layout.height + px(12) : baseH
    )

    this.draftText.setProperty(prop.MORE, { text: preview, h: contentH })
    this.draftText.setProperty(prop.COLOR, draft ? 0xffffff : 0x666666)
    this.viewport.setProperty(prop.MORE, {
      pos_y: Math.max(0, contentH - baseH)
    })
    this.counterText.setProperty(
      prop.TEXT,
      draft.length + '/' + MAX_CHARS
    )
    this.counterText.setProperty(
      prop.COLOR,
      draft.length >= MAX_CHARS ? 0xffaa00 : 0x888888
    )
    if (this.errorText) {
      this.errorText.setProperty(prop.TEXT, this.state.error || '')
    }
  },

  showError(message) {
    this.updateState({ error: message })
    this.renderDraft()
  },

  // ---------------------------------------------------------- Teclado ----
  // Mismo patron que ZeppAI (chat.page.js): createKeyboard con texto
  // inicial, onComplete guarda el borrador y onCancel (deslizar a la
  // derecha) alterna CHAR/NUM conservando el texto parcial.
  openKeyboard(withVoice) {
    if (withVoice && !this.voiceAvailable()) {
      this.showError('Voz no disponible: usa "Escribir"')
      logger.log('[ui] dictado no disponible en este reloj')
      return
    }

    const type = withVoice
      ? inputType.VOICE
      : (this.state.kbMode === 'NUM' ? inputType.NUM : inputType.CHAR)
    logger.log('[ui] solicitando teclado', { voice: withVoice, mode: this.state.kbMode })
    this.updateState({ error: '' })

    try {
      createKeyboard({
        inputType: type,
        text: this.state.draft,
        onComplete: (_, result) => {
          const text = result && typeof result.data === 'string' ? result.data : ''
          logger.log('[ui] teclado completado', { voice: withVoice, chars: text.length })
          deleteKeyboard()
          this.applyKeyboardResult(text, withVoice)
        },
        onCancel: (_, result) => {
          const text = result && typeof result.data === 'string'
            ? result.data
            : this.state.draft
          // En modo voz, cancelar simplemente cierra y conserva el borrador.
          if (withVoice) {
            logger.log('[ui] dictado cancelado, se conserva el borrador')
            deleteKeyboard()
            this.updateState({ draft: clampContent(text) })
            this.renderDraft()
            return
          }
          const nextMode = this.state.kbMode === 'NUM' ? 'CHAR' : 'NUM'
          logger.log('[ui] cambio de teclado CHAR/NUM', { to: nextMode })
          deleteKeyboard()
          this.updateState({ draft: clampContent(text), kbMode: nextMode })
          this.keyboardTimer = setTimeout(() => {
            this.keyboardTimer = null
            this.openKeyboard(false)
          }, 180)
        }
      })
    } catch (error) {
      logger.error('No se pudo abrir el teclado', error)
      this.showError('Teclado no disponible')
    }
  },

  /** El dictado es la unica parte que puede tirar del movil/sistema. */
  voiceAvailable() {
    try {
      if (keyboard && typeof keyboard.checkVoiceInputAvailable === 'function') {
        return !!keyboard.checkVoiceInputAvailable()
      }
    } catch (error) {
      logger.error('No se pudo comprobar la voz', error)
    }
    // Si el firmware no expone la comprobacion, intentamos abrir VOICE
    // igualmente: el sistema mostrara su propio error si no puede.
    return true
  },

  applyKeyboardResult(text, append) {
    let next
    if (append && this.state.draft) {
      // El dictado añade al texto existente, separado por espacio.
      next = clampContent(this.state.draft + ' ' + text)
    } else {
      next = clampContent(text)
    }
    const wasTruncated = next.length >= MAX_CHARS && text.length > 0
    this.updateState({ draft: next, error: wasTruncated ? 'Límite: ' + MAX_CHARS + ' caracteres' : '' })
    this.renderDraft()
  },

  // ------------------------------------------------------------ Guardar ----
  // Siempre local: LocalStorage del reloj (+respaldo en /data).
  save() {
    const text = (this.state.draft || '').trim()
    if (!text) {
      this.showError('Escribe algo primero')
      return
    }
    if (this.state.isNew && loadNotes().length >= MAX_NOTES) {
      this.showError('Límite: ' + MAX_NOTES + ' notas')
      return
    }

    const existing = this.state.noteId ? getNote(this.state.noteId) : null
    const note = existing
      ? { id: existing.id, content: clampContent(text), updatedAt: Date.now() }
      : createNote(text)

    if (!note) {
      this.showError('Escribe algo primero')
      return
    }

    const result = upsertNote(note)
    if (!result.ok) {
      logger.error('[notes] no se pudo guardar', result.reason)
      this.showError(result.reason === 'full'
        ? 'Límite: ' + MAX_NOTES + ' notas'
        : 'No se pudo guardar')
      return
    }

    logger.log('[notes] nota guardada en local', { id: note.id, chars: note.content.length })
    new Vibrator().start({ mode: VIBRATOR_SCENE_NOTIFICATION })
    deleteKeyboard()
    back()
  },

  cancel() {
    logger.log('[ui] edicion cancelada')
    new Vibrator().start({ mode: VIBRATOR_SCENE_SHORT_LIGHT })
    deleteKeyboard()
    back()
  },

  onDestroy() {
    logger.log('[lifecycle] editor onDestroy')
    if (this.keyboardTimer) {
      clearTimeout(this.keyboardTimer)
      this.keyboardTimer = null
    }
    deleteKeyboard()
    this.updateState({ draft: '', error: '' })
  }
})
