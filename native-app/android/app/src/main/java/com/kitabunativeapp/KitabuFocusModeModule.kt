package com.kitabunativeapp

import android.app.Activity
import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KitabuFocusModeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val credentialRequestCode = 4433
  private var credentialPromise: Promise? = null

  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != credentialRequestCode) {
          return
        }

        val promise = credentialPromise ?: return
        credentialPromise = null

        if (resultCode == Activity.RESULT_OK) {
          promise.resolve(true)
        } else {
          promise.reject("device_credential_cancelled", "Phone unlock was cancelled.")
        }
      }
    }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "KitabuFocusMode"

  @ReactMethod
  fun isScreenPinningSupported(promise: Promise) {
    promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)
  }

  @ReactMethod
  fun startScreenPinning(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "KITABU must be in the foreground to start Focus Mode.")
      return
    }

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
      promise.reject("screen_pinning_unsupported", "App Pinning is not supported on this Android version.")
      return
    }

    if (!isScreenPinningEnabled()) {
      promise.reject("screen_pinning_disabled", "App Pinning is turned off.")
      return
    }

    if (!isDeviceSecure()) {
      promise.reject("device_credential_unavailable", "Set up a phone PIN, pattern, or password to use Focus Mode.")
      return
    }

    activity.runOnUiThread {
      try {
        activity.startLockTask()
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("screen_pinning_failed", "Could not start Focus Mode.", error)
      }
    }
  }

  @ReactMethod
  fun stopScreenPinning(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "KITABU must be in the foreground to stop Focus Mode.")
      return
    }

    if (getLockTaskModeState() == ActivityManager.LOCK_TASK_MODE_NONE) {
      promise.resolve(true)
      return
    }

    activity.runOnUiThread {
      try {
        activity.stopLockTask()
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("screen_unpin_failed", "Could not stop Focus Mode.", error)
      }
    }
  }

  @ReactMethod
  fun openScreenPinningSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("settings_unavailable", "Could not open Android settings.", error)
    }
  }

  @ReactMethod
  fun confirmDeviceCredential(title: String, description: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "KITABU must be in the foreground to unlock parent controls.")
      return
    }

    val keyguardManager =
      reactContext.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    val intent = keyguardManager?.createConfirmDeviceCredentialIntent(title, description)
    if (intent == null) {
      promise.reject("device_credential_unavailable", "Set up a phone PIN, pattern, or password to use Focus Mode.")
      return
    }

    credentialPromise = promise
    activity.runOnUiThread {
      try {
        activity.startActivityForResult(intent, credentialRequestCode)
      } catch (error: Exception) {
        credentialPromise = null
        promise.reject("device_credential_failed", "Could not open phone unlock.", error)
      }
    }
  }

  private fun isScreenPinningEnabled(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
      return false
    }

    return try {
      Settings.Secure.getInt(reactContext.contentResolver, "lock_to_app_enabled", 0) == 1
    } catch (_: Exception) {
      false
    }
  }

  private fun isDeviceSecure(): Boolean {
    val keyguardManager =
      reactContext.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        ?: return false

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      keyguardManager.isDeviceSecure
    } else {
      keyguardManager.isKeyguardSecure
    }
  }

  private fun getLockTaskModeState(): Int {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
      return ActivityManager.LOCK_TASK_MODE_NONE
    }

    val activityManager =
      reactContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        ?: return ActivityManager.LOCK_TASK_MODE_NONE

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      activityManager.lockTaskModeState
    } else if (activityManager.isInLockTaskMode) {
      ActivityManager.LOCK_TASK_MODE_PINNED
    } else {
      ActivityManager.LOCK_TASK_MODE_NONE
    }
  }
}
