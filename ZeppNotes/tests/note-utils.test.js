/**
 * Tests de la logica pura de ZeppNotes (no requiere Zepp OS ni simulador).
 * Ejecutar:  npm test   (o: node tests/note-utils.test.js)
 */
const assert = require('assert')

import('../utils/note-utils.js').then((u) => {
  import('../utils/constants.js').then((c) => {
    const { MAX_NOTES, MAX_CHARS } = c
    const {
      clampContent, isFull, canAdd, noteTitle,
      formatDate, sortNotes, createNote, sanitizeNotes, parsePageParams
    } = u

    let passed = 0
    const test = (name, fn) => {
      try {
        fn()
        passed += 1
        console.log('  ok  ' + name)
      } catch (e) {
        console.error('  FAIL ' + name)
        console.error('       ' + (e && e.message))
        process.exitCode = 1
      }
    }

    console.log('\nlimites')
    test('20 notas x 1500 caracteres: constantes', () => {
      assert.strictEqual(MAX_NOTES, 20)
      assert.strictEqual(MAX_CHARS, 1500)
      assert.strictEqual(MAX_NOTES * MAX_CHARS, 30000)
    })
    test('clampContent recorta a 1500', () => {
      assert.strictEqual(clampContent('a'.repeat(2000)).length, 1500)
      assert.strictEqual(clampContent(null), '')
    })
    test('isFull/canAdd con 20 notas', () => {
      const full = new Array(20).fill({ id: 'x', content: 'a', updatedAt: 1 })
      assert.strictEqual(isFull(full), true)
      assert.strictEqual(canAdd(full), false)
      assert.strictEqual(canAdd(full.slice(0, 19)), true)
    })

    console.log('\ntitulos y orden')
    test('noteTitle usa la primera linea recortada', () => {
      assert.strictEqual(noteTitle('Hola mundo\nsegunda'), 'Hola mundo')
      assert.strictEqual(noteTitle('   '), '(vacía)')
      assert.strictEqual(noteTitle('   ', '(empty)'), '(empty)')
      assert.ok(noteTitle('a'.repeat(100)).length <= 34)
    })
    test('sortNotes recientes primero sin mutar', () => {
      const src = [{ updatedAt: 1 }, { updatedAt: 3 }, { updatedAt: 2 }]
      const out = sortNotes(src)
      assert.deepStrictEqual(out.map((n) => n.updatedAt), [3, 2, 1])
      assert.deepStrictEqual(src.map((n) => n.updatedAt), [1, 3, 2])
    })
    test('formatDate dd/mm hh:mm', () => {
      assert.match(formatDate(new Date(2026, 9, 14, 9, 5).getTime()), /^\d\d\/\d\d \d\d:\d\d$/)
    })

    console.log('\ncreacion y saneado')
    test('createNote rechaza vacio y recorta', () => {
      assert.strictEqual(createNote('   '), null)
      const n = createNote('b'.repeat(2000))
      assert.strictEqual(n.content.length, 1500)
      assert.ok(n.id && n.updatedAt > 0)
    })
    test('sanitizeNotes filtra basura y limita a 20', () => {
      const raw = [{ id: 'a', content: 'ok', updatedAt: 5 }, null, { content: '   ' }]
      for (let i = 0; i < 30; i += 1) raw.push({ id: 'n' + i, content: 't' + i, updatedAt: i })
      const out = sanitizeNotes(raw)
      assert.strictEqual(out.length, 20)
      assert.strictEqual(out[0].updatedAt >= out[out.length - 1].updatedAt, true)
    })
    test('sanitizeNotes con no-array devuelve []', () => {
      assert.deepStrictEqual(sanitizeNotes(null), [])
      assert.deepStrictEqual(sanitizeNotes('{}'), [])
    })

    console.log('\nrouter params')
    test('parsePageParams acepta objeto, JSON y basura', () => {
      assert.deepStrictEqual(parsePageParams({ id: '1' }), { id: '1' })
      assert.deepStrictEqual(parsePageParams(JSON.stringify({ id: '2' })), { id: '2' })
      assert.deepStrictEqual(parsePageParams('no-json{{{'), {})
      assert.deepStrictEqual(parsePageParams(null), {})
    })

    console.log('\nOK: ' + passed + ' tests')
  })
}).catch((e) => {
  console.error('No se pudo cargar el modulo:', e && e.message)
  process.exitCode = 1
})
