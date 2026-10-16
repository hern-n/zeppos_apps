/**
 * Captura de errores en lifecycles (best practice error-catch).
 *
 * El framework no captura errores de lifecycle y los logs del reloj se
 * truncan sin source-maps, así que el mensaje y la pila se imprimen línea
 * por línea para poder localizar el fallo en el simulador o en real.
 * Recibe el logger para no importar @zos/utils aquí y seguir siendo
 * testeable en Node con un logger falso.
 */
export function reportError(logger, context, error) {
  try {
    const message = error && error.message ? error.message : String(error)
    logger.error(context, message)
    const stack = error && error.stack ? String(error.stack) : ''
    if (stack) {
      stack.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed) logger.error(context + ' :: ' + trimmed)
      })
    }
  } catch (e) {}
}
