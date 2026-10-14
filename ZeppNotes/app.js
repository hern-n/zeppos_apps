import './shared/device-polyfill'

App({
  globalData: {},

  onCreate(options) {
    console.log('[zeppnotes] onCreate', options)
  },

  onDestroy(options) {
    console.log('[zeppnotes] onDestroy', options)
  }
})
