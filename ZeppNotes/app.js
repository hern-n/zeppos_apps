import './shared/device-polyfill'
import { log } from '@zos/utils'

const logger = log.getLogger('zeppnotes-app')

App({
  globalData: {},

  onCreate(options) {
    logger.log('[lifecycle] onCreate', options)
  },

  onDestroy(options) {
    logger.log('[lifecycle] onDestroy', options)
  }
})
