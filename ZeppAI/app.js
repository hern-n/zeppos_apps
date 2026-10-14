import './shared/device-polyfill'
import { MessageBuilder } from './shared/message'
import { getPackageInfo } from '@zos/app'
import * as ble from '@zos/ble'
import { log } from '@zos/utils'

const logger = log.getLogger('zeppai-app')

App({
  globalData: {
    messageBuilder: null
  },

  onCreate(options) {
    const { appId } = getPackageInfo()
    logger.log('[lifecycle] onCreate', { appId, options })
    const messageBuilder = new MessageBuilder({
      appId,
      appDevicePort: 20,
      appSidePort: 0,
      ble
    })

    this.globalData.messageBuilder = messageBuilder
    logger.log('[ble] iniciando MessageBuilder.connect', { appId, appDevicePort: 20, appSidePort: 0 })
    messageBuilder.connect()
  },

  onDestroy(options) {
    logger.log('[lifecycle] onDestroy', options)
    const messageBuilder = this.globalData.messageBuilder
    if (messageBuilder) {
      messageBuilder.disConnect()
    }
    this.globalData.messageBuilder = null
  }
})
