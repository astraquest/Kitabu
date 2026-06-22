package com.kitabunativeapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class KitabuNativePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(
      KitabuSpeechModule(reactContext),
      KitabuRecorderModule(reactContext),
      KitabuDocumentPickerModule(reactContext),
      KitabuAuthConfigModule(reactContext),
      KitabuFocusModeModule(reactContext),
    )

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
