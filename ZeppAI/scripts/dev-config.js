/**
 * Genera app-side/dev-config.local.js a partir de .env.local.
 *
 * El Side Service se ejecuta dentro de la Zepp App del movil, donde no
 * existe process.env. Por eso la clave de desarrollo se compila a un
 * fichero JS que se importa desde app-side/index.js.
 *
 * Uso:  npm run dev:config
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.local')
const appSideOutPath = path.join(root, 'app-side', 'dev-config.local.js')
const settingOutPath = path.join(root, 'setting', 'dev-config.local.js')
const release = process.argv.indexOf('--release') >= 0

function parseEnv(content) {
  const result = {}

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const index = trimmed.indexOf('=')
    if (index === -1) return

    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  })

  return result
}

if (!release && !fs.existsSync(envPath)) {
  console.error('No existe .env.local. Crealo con GROQ_API_KEY=... antes de generar.')
  process.exit(1)
}

const env = !release && fs.existsSync(envPath)
  ? parseEnv(fs.readFileSync(envPath, 'utf8'))
  : {}
const apiKey = release ? '' : (env.GROQ_API_KEY || '')

const contents = `// GENERADO AUTOMATICAMENTE por scripts/dev-config.js desde .env.local
// No editar a mano. Este fichero esta en .gitignore.
export const DEV_GROQ_API_KEY = ${JSON.stringify(apiKey)}
export const DEV_CONFIG_ENABLED = ${apiKey ? 'true' : 'false'}
`

fs.writeFileSync(appSideOutPath, contents, 'utf8')
fs.writeFileSync(settingOutPath, contents, 'utf8')

if (release) {
  console.log('OK: configuracion de release generada sin API key de desarrollo.')
} else if (apiKey) {
  console.log('OK: app-side/dev-config.local.js generado con GROQ_API_KEY configurada.')
} else {
  console.log('AVISO: GROQ_API_KEY vacio. La IA no respondera hasta rellenarlo.')
}
