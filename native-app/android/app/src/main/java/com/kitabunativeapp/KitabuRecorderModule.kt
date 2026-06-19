package com.kitabunativeapp

import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class KitabuRecorderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var recorder: MediaRecorder? = null
  private var currentOutputPath: String? = null

  override fun getName(): String = "KitabuRecorder"

  @ReactMethod
  fun startRecording(promise: Promise) {
    try {
      stopInternal()

      val outputFile = File(reactContext.cacheDir, "kitabu-${System.currentTimeMillis()}.m4a")
      currentOutputPath = outputFile.absolutePath

      recorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          MediaRecorder(reactContext)
        } else {
          @Suppress("DEPRECATION")
          MediaRecorder()
        }

      recorder?.apply {
        setAudioSource(MediaRecorder.AudioSource.MIC)
        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        setAudioChannels(1)
        setAudioSamplingRate(44100)
        setAudioEncodingBitRate(96000)
        setOutputFile(currentOutputPath)
        prepare()
        start()
      }

      promise.resolve(currentOutputPath)
    } catch (error: Exception) {
      promise.reject("record_start_failed", error.message, error)
    }
  }

  @ReactMethod
  fun stopRecording(promise: Promise) {
    try {
      recorder?.stop()
      recorder?.release()
      recorder = null
      promise.resolve(currentOutputPath)
    } catch (error: Exception) {
      stopInternal()
      promise.reject("record_stop_failed", error.message, error)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve("android_native")
  }

  @ReactMethod
  fun readAudioAsBase64(audioPath: String, promise: Promise) {
    try {
      val audioFile = File(audioPath)
      if (!audioFile.exists()) {
        promise.reject("audio_file_missing", "Recorded audio file was not found")
        return
      }

      val base64 = Base64.encodeToString(audioFile.readBytes(), Base64.NO_WRAP)
      promise.resolve(base64)
    } catch (error: Exception) {
      promise.reject("audio_read_failed", error.message, error)
    }
  }

  private fun stopInternal() {
    try {
      recorder?.stop()
    } catch (_: Exception) {
    }

    recorder?.release()
    recorder = null
  }

  override fun invalidate() {
    stopInternal()
    super.invalidate()
  }
}
