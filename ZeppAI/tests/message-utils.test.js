/**
 * Tests de la logica pura de ZeppAI (no requiere Zepp OS ni el simulador).
 * Ejecutar:  node tests/message-utils.test.js
 */
const assert = require('assert')

// El modulo usa ES modules; los cargamos como ESM desde un .mjs temporal
// para poder ejecutarlos con Node sin configurar el proyecto.
import('../utils/message-utils.js').then(({ parseSearchPrefix, splitIntoChunks, limitHistory }) => {
  let passed = 0
  const test = (name, fn) => {
    try {
      fn()
      passed += 1
      console.log('  ok  ' + name)
    } catch (e) {
      console.error('  FAIL ' + name)
      console.error('       ' + e.message)
      process.exitCode = 1
    }
  }

  console.log('\nparseSearchPrefix')

  test('mensaje normal NO activa busqueda', () => {
    const r = parseSearchPrefix('hola que tal')
    assert.strictEqual(r.search, false)
    assert.strictEqual(r.content, 'hola que tal')
  })

  test('! al inicio SI activa busqueda y quita el prefijo', () => {
    const r = parseSearchPrefix('!noticias de hoy')
    assert.strictEqual(r.search, true)
    assert.strictEqual(r.content, 'noticias de hoy')
  })

  test('! sin texto despues no envia nada', () => {
    const r = parseSearchPrefix('!   ')
    assert.strictEqual(r.search, true)
    assert.strictEqual(r.content, '')
  })

  test('solo el primer caracter cuenta: mid-string NO activa', () => {
    const r = parseSearchPrefix('hola! que tal')
    assert.strictEqual(r.search, false)
    assert.strictEqual(r.content, 'hola! que tal')
  })

  test('varios signos exclamacion quitan solo el primero', () => {
    const r = parseSearchPrefix('!!doble')
    assert.strictEqual(r.search, true)
    assert.strictEqual(r.content, '!doble')
  })

  test('espacios alrededor se recortan', () => {
    const r = parseSearchPrefix('   !buscar esto   ')
    assert.strictEqual(r.search, true)
    assert.strictEqual(r.content, 'buscar esto')
  })

  test('cadena vacia no rompe', () => {
    const r = parseSearchPrefix('')
    assert.strictEqual(r.search, false)
    assert.strictEqual(r.content, '')
  })

  test('undefined / null no rompen', () => {
    assert.strictEqual(parseSearchPrefix(undefined).search, false)
    assert.strictEqual(parseSearchPrefix(null).search, false)
  })

  console.log('\nsplitIntoChunks')

  test('texto corto es un solo trozo', () => {
    assert.deepStrictEqual(splitIntoChunks('hola', 48), ['hola'])
  })

  test('trocea sin partir palabras', () => {
    const chunks = splitIntoChunks('uno dos tres cuatro cinco seis', 10)
    assert.ok(chunks.length > 1, 'deberia trocear')
    chunks.forEach((c) => assert.ok(c.length <= 10, 'trozo demasiado largo: ' + c))
    assert.strictEqual(chunks.join(''), 'uno dos tres cuatro cinco seis')
  })

  test('palabra sin espacios se parte por tamano', () => {
    const chunks = splitIntoChunks('abcdefghij', 4)
    assert.strictEqual(chunks.join(''), 'abcdefghij')
    chunks.forEach((c) => assert.ok(c.length <= 4))
  })

  test('texto vacio devuelve lista vacia', () => {
    assert.deepStrictEqual(splitIntoChunks('', 48), [])
    assert.deepStrictEqual(splitIntoChunks(undefined, 48), [])
  })

  test('respuesta larga genera muchos trozos (streaming)', () => {
    const largo = 'palabra '.repeat(400)
    const chunks = splitIntoChunks(largo, 48)
    assert.ok(chunks.length > 50, 'deberia generar muchos trozos, got ' + chunks.length)
    assert.strictEqual(chunks.join(''), largo)
  })

  console.log('\nlimitHistory')

  test('recorta por numero de mensajes', () => {
    const msgs = Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: 'm' + i }))
    const out = limitHistory(msgs, 20, 1000)
    assert.strictEqual(out.length, 20)
    assert.strictEqual(out[out.length - 1].content, 'm29')
  })

  test('recorta cada mensaje por caracteres', () => {
    const out = limitHistory([{ role: 'user', content: 'x'.repeat(500) }], 20, 100)
    assert.strictEqual(out[0].content.length, 100)
  })

  test('mantiene rol y contenido', () => {
    const out = limitHistory([{ role: 'assistant', content: 'hola' }], 20, 100)
    assert.strictEqual(out[0].role, 'assistant')
    assert.strictEqual(out[0].content, 'hola')
  })

  test('array vacio o invalido no rompe', () => {
    assert.deepStrictEqual(limitHistory([], 20, 100), [])
    assert.deepStrictEqual(limitHistory(undefined, 20, 100), [])
  })

  console.log('\n' + passed + ' tests pasaron' + (process.exitCode ? ', HAY FALLOS' : ', todo correcto') + '\n')
})
