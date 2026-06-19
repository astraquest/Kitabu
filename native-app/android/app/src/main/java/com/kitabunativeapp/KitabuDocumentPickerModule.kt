package com.kitabunativeapp

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream

class KitabuDocumentPickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pickerPromise: Promise? = null
  private val requestCode = 4421
  private val photoRequestCode = 4422
  private val maxAttachmentBytes = 15 * 1024 * 1024

  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode == this@KitabuDocumentPickerModule.photoRequestCode) {
          handlePhotoResult(resultCode, data)
          return
        }

        if (requestCode == this@KitabuDocumentPickerModule.requestCode) {
          handleDocumentResult(resultCode, data)
          return
        }
      }
    }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "KitabuDocumentPicker"

  @ReactMethod
  fun pickPdf(promise: Promise) {
    openDocument("application/pdf", "No PDF was selected.", promise)
  }

  @ReactMethod
  fun pickImage(promise: Promise) {
    openDocument("image/*", "No image was selected.", promise)
  }

  @ReactMethod
  fun pickFile(promise: Promise) {
    openDocument("*/*", "No file was selected.", promise)
  }

  @ReactMethod
  fun takePhoto(promise: Promise) {
    if (reactApplicationContext.currentActivity == null) {
      promise.reject("picker_unavailable", "Current activity is not available.")
      return
    }

    pickerPromise = promise

    val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
    val didStart = reactApplicationContext.startActivityForResult(intent, photoRequestCode, null)
    if (!didStart) {
      pickerPromise = null
      promise.reject("camera_unavailable", "Could not launch the camera.")
    }
  }

  private fun openDocument(mimeType: String, _cancelMessage: String, promise: Promise) {
    if (reactApplicationContext.currentActivity == null) {
      promise.reject("picker_unavailable", "Current activity is not available.")
      return
    }

    pickerPromise = promise

    val intent =
      Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = mimeType
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
      }

    val didStart = reactApplicationContext.startActivityForResult(intent, requestCode, null)
    if (!didStart) {
      pickerPromise = null
      promise.reject("picker_unavailable", "Could not launch the Android document picker.")
    }
  }

  private fun handleDocumentResult(resultCode: Int, data: Intent?) {
    val promise = pickerPromise ?: return
    pickerPromise = null

    if (resultCode != Activity.RESULT_OK || data?.data == null) {
      promise.reject("picker_cancelled", "No file was selected.")
      return
    }

    val uri: Uri = data.data ?: run {
      promise.reject("picker_error", "Missing file URI.")
      return
    }

    try {
      reactContext.contentResolver.takePersistableUriPermission(
        uri,
        Intent.FLAG_GRANT_READ_URI_PERMISSION,
      )
    } catch (_: SecurityException) {
    }

    try {
      promise.resolve(buildResultForUri(uri))
    } catch (error: IllegalArgumentException) {
      promise.reject("picker_file_too_large", error.message ?: "Selected file is too large.", error)
    } catch (error: Exception) {
      promise.reject("picker_read_failed", "Could not read the selected file.", error)
    }
  }

  private fun handlePhotoResult(resultCode: Int, data: Intent?) {
    val promise = pickerPromise ?: return
    pickerPromise = null

    if (resultCode != Activity.RESULT_OK) {
      promise.reject("camera_cancelled", "No photo was captured.")
      return
    }

    val bitmap = data?.extras?.get("data") as? android.graphics.Bitmap
    if (bitmap == null) {
      promise.reject("camera_error", "Captured photo data was unavailable.")
      return
    }

    val output = ByteArrayOutputStream()
    bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, output)
    val base64Data = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)

    val result = Arguments.createMap().apply {
      putString("uri", "camera://capture")
      putString("name", "homework-photo.jpg")
      putString("mimeType", "image/jpeg")
      putString("base64Data", base64Data)
    }

    promise.resolve(result)
  }

  private fun buildResultForUri(uri: Uri) =
    Arguments.createMap().apply {
      val mimeType = reactContext.contentResolver.getType(uri) ?: "application/octet-stream"
      val bytes = reactContext.contentResolver.openInputStream(uri)?.use { input ->
        input.readBytes()
      } ?: ByteArray(0)

      if (bytes.size > maxAttachmentBytes) {
        throw IllegalArgumentException("Selected file is too large.")
      }

      putString("uri", uri.toString())
      putString("name", getDisplayName(uri) ?: uri.lastPathSegment ?: "attachment")
      putString("mimeType", mimeType)
      putString("base64Data", Base64.encodeToString(bytes, Base64.NO_WRAP))
    }

  private fun getDisplayName(uri: Uri): String? {
    val cursor = reactContext.contentResolver.query(uri, null, null, null, null) ?: return null
    return cursor.use {
      val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      if (nameIndex >= 0 && it.moveToFirst()) it.getString(nameIndex) else null
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve("android_native")
  }
}
