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
      formatDate, sortNotes, createNote, sanitizeNotes, parsePageParams,
      isImportant, importantCount, canMarkImportant, orderedNotes, selectNotes
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

    console.log('\nfavoritas')
    test('MAX_IMPORTANT = 3, WIDGET_NOTES = 3, CARD_NOTES = 2', () => {
      assert.strictEqual(c.MAX_IMPORTANT, 3)
      assert.strictEqual(c.WIDGET_NOTES, 3)
      assert.strictEqual(c.CARD_NOTES, 2)
    })
    test('createNote nace sin fijar y sanitizeNotes respeta el flag', () => {
      assert.strictEqual(createNote('hola').important, false)
      const out = sanitizeNotes([
        { id: 'a', content: 'fijada', updatedAt: 1, important: true },
        { id: 'b', content: 'normal', updatedAt: 2, important: 'yes' }
      ])
      assert.strictEqual(isImportant(out.find((n) => n.id === 'a')), true)
      assert.strictEqual(isImportant(out.find((n) => n.id === 'b')), false)
    })
    test('importantCount/canMarkImportant cortan en 3', () => {
      const three = [
        { id: '1', content: 'a', updatedAt: 1, important: true },
        { id: '2', content: 'b', updatedAt: 2, important: true },
        { id: '3', content: 'c', updatedAt: 3, important: true }
      ]
      assert.strictEqual(importantCount(three), 3)
      assert.strictEqual(canMarkImportant(three), false)
      assert.strictEqual(canMarkImportant(three.slice(0, 2)), true)
      assert.strictEqual(canMarkImportant(null), true)
    })
    test('orderedNotes: fijadas primero y despues por recencia', () => {
      const notes = [
        { id: 'r1', content: 'reciente', updatedAt: 90 },
        { id: 'p1', content: 'fijada vieja', updatedAt: 10, important: true },
        { id: 'r2', content: 'antigua', updatedAt: 20 },
        { id: 'p2', content: 'fijada nueva', updatedAt: 50, important: true }
      ]
      assert.deepStrictEqual(orderedNotes(notes).map((n) => n.id), ['p2', 'p1', 'r1', 'r2'])
      assert.deepStrictEqual(notes.map((n) => n.id), ['r1', 'p1', 'r2', 'p2'])
    })
    test('selectNotes rellena con recientes si faltan fijadas', () => {
      const notes = [
        { id: 'r1', content: 'x', updatedAt: 90 },
        { id: 'r2', content: 'x', updatedAt: 80 },
        { id: 'p1', content: 'x', updatedAt: 10, important: true },
        { id: 'r3', content: 'x', updatedAt: 70 }
      ]
      assert.deepStrictEqual(selectNotes(notes, 3).map((n) => n.id), ['p1', 'r1', 'r2'])
      assert.deepStrictEqual(selectNotes(notes, 2).map((n) => n.id), ['p1', 'r1'])
      assert.deepStrictEqual(selectNotes(notes, 0), [])
      assert.deepStrictEqual(selectNotes(null, 3), [])
    })
    test('selectNotes sin fijadas usa las 3/2 mas recientes', () => {
      const notes = [
        { id: 'a', content: 'x', updatedAt: 1 },
        { id: 'b', content: 'x', updatedAt: 3 },
        { id: 'c', content: 'x', updatedAt: 2 },
        { id: 'd', content: 'x', updatedAt: 4 }
      ]
      assert.deepStrictEqual(selectNotes(notes, 3).map((n) => n.id), ['d', 'b', 'c'])
      assert.deepStrictEqual(selectNotes(notes, 2).map((n) => n.id), ['d', 'b'])
    })
    test('sanitizeNotes limita el listado a MAX_NOTES conservando fijadas', () => {
      const raw = [{ id: 'a', content: 'fijada', updatedAt: 5, important: true }]
      for (let i = 0; i < 30; i += 1) raw.push({ id: 'n' + i, content: 't' + i, updatedAt: i })
      const out = sanitizeNotes(raw)
      assert.strictEqual(out.length, 20)
      assert.strictEqual(importantCount(out), 1)
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
