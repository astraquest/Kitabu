package com.kitabunativeapp

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import kotlin.concurrent.thread

class KitabuRecorderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var recorder: MediaRecorder? = null
  private var currentOutputPath: String? = null
  private var pcmRecorder: AudioRecord? = null
  private var pcmThread: Thread? = null
  @Volatile private var isPcmStreaming = false

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

  @ReactMethod
  fun startPcmStream(promise: Promise) {
    try {
      stopPcmStreamInternal()

      val sampleRate = 24000
      val channelConfig = AudioFormat.CHANNEL_IN_MONO
      val audioFormat = AudioFormat.ENCODING_PCM_16BIT
      val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
      if (minBufferSize <= 0) {
        promise.reject("pcm_stream_unavailable", "PCM recording is unavailable on this device")
        return
      }

      val chunkSize = sampleRate * 2 / 10
      val bufferSize = maxOf(minBufferSize, chunkSize * 2)

      @Suppress("MissingPermission")
      val audioRecord = AudioRecord(
        MediaRecorder.AudioSource.VOICE_RECOGNITION,
        sampleRate,
        channelConfig,
        audioFormat,
        bufferSize,
      )

      if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
        audioRecord.release()
        promise.reject("pcm_stream_unavailable", "PCM recording failed to initialize")
        return
      }

      pcmRecorder = audioRecord
      isPcmStreaming = true
      audioRecord.startRecording()

      pcmThread = thread(name = "KitabuPcmStream") {
        val buffer = ByteArray(chunkSize)
        while (isPcmStreaming) {
          val bytesRead = audioRecord.read(buffer, 0, buffer.size)
          if (bytesRead > 0) {
            val chunk = if (bytesRead == buffer.size) buffer else buffer.copyOf(bytesRead)
            emitPcmChunk(Base64.encodeToString(chunk, Base64.NO_WRAP))
          }
        }
      }

      promise.resolve(true)
    } catch (error: Exception) {
      stopPcmStreamInternal()
      promise.reject("pcm_stream_start_failed", error.message, error)
    }
  }

  @ReactMethod
  fun stopPcmStream(promise: Promise) {
    try {
      stopPcmStreamInternal()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("pcm_stream_stop_failed", error.message, error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by React Native event emitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by React Native event emitter.
  }

  private fun emitPcmChunk(base64Pcm: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("KitabuRecorderPcmChunk", base64Pcm)
  }

  private fun stopInternal() {
    try {
      recorder?.stop()
    } catch (_: Exception) {
    }

    recorder?.release()
    recorder = null
  }

  private fun stopPcmStreamInternal() {
    isPcmStreaming = false
    try {
      pcmRecorder?.stop()
    } catch (_: Exception) {
    }
    pcmRecorder?.release()
    pcmRecorder = null
    pcmThread = null
  }

  override fun invalidate() {
    stopInternal()
    stopPcmStreamInternal()
    super.invalidate()
  }
}
