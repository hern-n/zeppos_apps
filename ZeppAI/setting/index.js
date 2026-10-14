import { gettext } from 'i18n'
import { DEV_GROQ_API_KEY } from './dev-config.local'
import {
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_REASONING_EFFORT,
  KEY_SETTING_GROQ_KEY,
  KEY_SETTING_MODEL,
  KEY_SETTING_SYSTEM_PROMPT,
  KEY_SETTING_REASONING
} from '../utils/constants'

const REASONING_OPTIONS = [
  { name: 'Bajo (recomendado)', value: 'low' },
  { name: 'Medio', value: 'medium' },
  { name: 'Alto', value: 'high' }
]

function getStoredValue(storage, key, fallback) {
  try {
    return storage.getItem(key) || fallback
  } catch (error) {
    return fallback
  }
}

AppSettingsPage({
  build(props) {
    const storage = props.settingsStorage
    const savedKey = getStoredValue(storage, KEY_SETTING_GROQ_KEY, '')
    const displayedKey = savedKey || DEV_GROQ_API_KEY
    const model = getStoredValue(storage, KEY_SETTING_MODEL, DEFAULT_MODEL)
    const systemPrompt = getStoredValue(
      storage,
      KEY_SETTING_SYSTEM_PROMPT,
      DEFAULT_SYSTEM_PROMPT
    )
    const savedReasoning = getStoredValue(
      storage,
      KEY_SETTING_REASONING,
      DEFAULT_REASONING_EFFORT
    )
    const reasoning = ['low', 'medium', 'high'].indexOf(savedReasoning) >= 0
      ? savedReasoning
      : DEFAULT_REASONING_EFFORT

    const labelStyle = { fontSize: '18px', color: '#525866' }

    return View(
      {
        style: {
          padding: '20px 22px',
          backgroundColor: '#f5f7fa'
        }
      },
      [
        Text({
          label: 'ZeppAI · Ajustes',
          style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }
        }),
        Text({
          label: 'Los campos se guardan automáticamente en el móvil.',
          style: { fontSize: '18px', color: '#667085', marginBottom: '24px' }
        }),

        TextInput({
          label: 'Clave API de Groq',
          placeholder: displayedKey
            ? 'Hay una clave guardada; pega otra para cambiarla'
            : 'Pega aquí tu clave gsk_…',
          value: displayedKey,
          settingsKey: KEY_SETTING_GROQ_KEY,
          maxLength: 200,
          labelStyle
        }),

        TextInput({
          label: 'Modelo',
          placeholder: DEFAULT_MODEL,
          value: model,
          settingsKey: KEY_SETTING_MODEL,
          maxLength: 80,
          labelStyle
        }),

        Select({
          label: 'Esfuerzo de razonamiento',
          title: 'Elige el esfuerzo de razonamiento',
          options: REASONING_OPTIONS,
          value: reasoning,
          onChange: (value) => {
            storage.setItem(KEY_SETTING_REASONING, value)
          }
        }),

        TextInput({
          label: 'Instrucciones del sistema',
          placeholder: DEFAULT_SYSTEM_PROMPT,
          value: systemPrompt,
          settingsKey: KEY_SETTING_SYSTEM_PROMPT,
          multiline: true,
          rows: 4,
          maxLength: 400,
          labelStyle
        }),

        Text({
          label: gettext('searchHint'),
          style: {
            fontSize: '16px',
            color: '#667085',
            marginTop: '16px'
          }
        })
      ]
    )
  }
})
