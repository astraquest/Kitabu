package com.kitabunativeapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class KitabuAuthConfigModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "KitabuAuthConfig"

  override fun getConstants(): Map<String, Any> = mapOf(
    "googleWebClientId" to BuildConfig.GOOGLE_WEB_CLIENT_ID,
  )
}
