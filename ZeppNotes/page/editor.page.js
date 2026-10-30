import {
  createWidget, widget, prop, align, text_style,
  createKeyboard, deleteKeyboard, inputType, keyboard,
  getTextLayout
} from '@zos/ui'
import { px, log } from '@zos/utils'
import { getText } from '@zos/i18n'
import { back } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { MAX_CHARS, MAX_NOTES } from '../utils/constants.js'
import { loadNotes, getNote, upsertNote } from '../utils/store.js'
import { clampContent, createNote, parsePageParams } from '../utils/note-utils.js'
import { C } from '../utils/theme.js'
import { reportError } from '../utils/error-utils.js'

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
      reportError(logger, '[editor] build', error)
    }
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
      x: 0,
      y: px(34),
      w: px(466),
      h: px(46),
      text: this.state.isNew ? getText('editorNew') : getText('editorEdit'),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(36),
      color: C.text
    })

    this.counterText = createWidget(widget.TEXT, {
      x: 0,
      y: px(82),
      w: px(466),
      h: px(24),
      text: '',
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(22),
      color: C.textDim
    })

    this.viewport = createWidget(widget.VIEW_CONTAINER, {
      x: px(50),
      y: px(112),
      w: px(366),
      h: px(174),
      scroll_enable: 1,
      pos_y: 0
    })

    this.draftText = this.viewport.createWidget(widget.TEXT, {
      x: 0,
      y: 0,
      w: px(366),
      h: px(174),
      text: '',
      color: C.text,
      text_size: px(30),
      text_style: text_style.WRAP
    })

    this.errorText = createWidget(widget.TEXT, {
      x: px(40),
      y: px(288),
      w: px(386),
      h: px(24),
      text: '',
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text_size: px(22),
      color: C.danger
    })

    const btn = (opts) => createWidget(widget.BUTTON, Object.assign({
      w: px(134),
      h: px(46),
      radius: px(23),
      text_size: px(26)
    }, opts))

    // Fila 1: Escribir (local) + Dictar (voz del sistema).
    btn({
      x: px(92),
      y: px(314),
      text: getText('write'),
      normal_color: C.surface,
      press_color: C.surfacePressed,
      color: C.text,
      click_func: () => this.openKeyboard(false)
    })

    btn({
      x: px(240),
      y: px(314),
      text: getText('dictate'),
      normal_color: C.surface,
      press_color: C.surfacePressed,
      color: C.text,
      click_func: () => this.openKeyboard(true)
    })

    // Fila 2: Guardar (local) + Cancelar.
    btn({
      x: px(92),
      y: px(366),
      text: getText('save'),
      normal_color: C.accent,
      press_color: C.accentPressed,
      color: 0xffffff,
      click_func: () => this.save()
    })

    btn({
      x: px(240),
      y: px(366),
      text: getText('cancel'),
      normal_color: C.surface,
      press_color: C.surfacePressed,
      color: C.textDim,
      click_func: () => this.cancel()
    })
  },

  renderDraft() {
    const draft = this.state.draft || ''
    const preview = draft || getText('writeHint')
    const baseH = px(174)

    const layout = getTextLayout(preview, {
      text_size: px(30),
      text_width: px(366),
      wrapped: 1
    })
    const contentH = Math.max(
      baseH,
      layout && layout.height ? layout.height + px(12) : baseH
    )

    this.draftText.setProperty(prop.MORE, { text: preview, h: contentH })
    this.draftText.setProperty(prop.COLOR, draft ? C.text : C.textMuted)
    this.viewport.setProperty(prop.MORE, {
      pos_y: Math.max(0, contentH - baseH)
    })
    this.counterText.setProperty(
      prop.TEXT,
      draft.length + '/' + MAX_CHARS
    )
    this.counterText.setProperty(
      prop.COLOR,
      draft.length >= MAX_CHARS ? C.gold : C.textDim
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
      this.showError(getText('voiceNA'))
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
      reportError(logger, '[editor] openKeyboard', error)
      this.showError(getText('keyboardNA'))
    }
  },

  /** El dictado es la unica parte que puede tirar del movil/sistema. */
  voiceAvailable() {
    try {
      if (keyboard && typeof keyboard.checkVoiceInputAvailable === 'function') {
        return !!keyboard.checkVoiceInputAvailable()
      }
    } catch (error) {
      reportError(logger, '[editor] voiceAvailable', error)
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
    this.updateState({ draft: next, error: wasTruncated ? getText('limitWord') + ': ' + MAX_CHARS + ' ' + getText('charsUnit') : '' })
    this.renderDraft()
  },

  // ------------------------------------------------------------ Guardar ----
  // Siempre local: LocalStorage del reloj (+respaldo en /data).
  save() {
    const text = (this.state.draft || '').trim()
    if (!text) {
      this.showError(getText('emptyFirst'))
      return
    }
    if (this.state.isNew && loadNotes().length >= MAX_NOTES) {
      this.showError(getText('limitWord') + ': ' + MAX_NOTES + ' ' + getText('notesUnit'))
      return
    }

    const existing = this.state.noteId ? getNote(this.state.noteId) : null
    // Al editar se conserva si la nota estaba fijada.
    const note = existing
      ? {
        id: existing.id,
        content: clampContent(text),
        updatedAt: Date.now(),
        important: existing.important === true
      }
      : createNote(text)

    if (!note) {
      this.showError(getText('emptyFirst'))
      return
    }

    const result = upsertNote(note)
    if (!result.ok) {
      logger.error('[notes] no se pudo guardar', result.reason)
      this.showError(result.reason === 'full'
        ? getText('limitWord') + ': ' + MAX_NOTES + ' ' + getText('notesUnit')
        : getText('saveFail'))
      return
    }

    logger.log('[notes] nota guardada en local', { id: note.id, chars: note.content.length })
    new Vibrator().start({ mode: VIBRATOR_SCENE_NOTIFICATION })
    deleteKeyboard()
    back()
  },

  cancel() {
    logger.log('[ui] edicion cancelada')
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
