describe('chatAttachmentBridge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    const { Platform } = require('react-native');
    Platform.OS = 'web';

    jest.doMock('expo-file-system/legacy', () => ({
      EncodingType: { Base64: 'base64' },
      getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
      readAsStringAsync: jest.fn(() => Promise.resolve('')),
    }));
  });

  test('reads browser document picker File data into an AI file attachment', async () => {
    const DocumentPicker = require('expo-document-picker');
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'blob:worksheet',
          name: 'worksheet.pdf',
          mimeType: 'application/pdf',
          file: {
            name: 'worksheet.pdf',
            size: 4,
            type: 'application/pdf',
            arrayBuffer: () => Promise.resolve(Uint8Array.from([37, 80, 68, 70]).buffer),
          },
        },
      ],
    });

    const { chatAttachmentBridge } = require('../src/services/nativeBridges');
    const attachment = await chatAttachmentBridge.pickFile();

    expect(attachment).toEqual({
      data: 'JVBERg==',
      mimeType: 'application/pdf',
      name: 'worksheet.pdf',
      type: 'file',
    });
  });

  test('reads browser image picker File data into an AI image attachment', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'blob:photo',
          fileName: 'homework.png',
          mimeType: 'image/png',
          file: {
            name: 'homework.png',
            size: 4,
            type: 'image/png',
            arrayBuffer: () => Promise.resolve(Uint8Array.from([137, 80, 78, 71]).buffer),
          },
        },
      ],
    });

    const { chatAttachmentBridge } = require('../src/services/nativeBridges');
    const attachment = await chatAttachmentBridge.pickImage();

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      allowsEditing: true,
      base64: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
    });

    expect(attachment).toEqual({
      data: 'iVBORw==',
      mimeType: 'image/png',
      name: 'homework.png',
      type: 'image',
    });
  });

  test('bounds camera capture options before decoding a chat attachment', async () => {
    const ImagePicker = require('expo-image-picker');
    const { chatAttachmentBridge } = require('../src/services/nativeBridges');

    await expect(chatAttachmentBridge.takePhoto()).resolves.toBeNull();

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
      allowsEditing: true,
      base64: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
    });
  });
});

describe('audioRecordingBridge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    const { Platform } = require('react-native');
    Platform.OS = 'android';
    jest.doMock('expo-file-system/legacy', () => ({
      EncodingType: { Base64: 'base64' },
      readAsStringAsync: jest.fn(() => Promise.resolve('')),
    }));
  });

  test('reports a successful start even when Android exposes the URI only after stop', async () => {
    const ExpoAudio = require('expo-audio');
    const recorder = {
      uri: null as string | null,
      isRecording: true,
      prepareToRecordAsync: jest.fn(() => Promise.resolve()),
      record: jest.fn(),
      getStatus: jest.fn(() => ({ isRecording: true })),
      stop: jest.fn(async () => {
        recorder.uri = 'file:///recording.m4a';
      }),
      release: jest.fn(),
    };
    ExpoAudio.AudioModule.AudioRecorder.mockImplementation(() => recorder);

    const { audioRecordingBridge } = require('../src/services/nativeBridges');

    await expect(audioRecordingBridge.startRecording()).resolves.toBe(true);
    expect(recorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    expect(recorder.record).toHaveBeenCalledTimes(1);
    await expect(audioRecordingBridge.stopRecording()).resolves.toBe('file:///recording.m4a');
  });

  test('rejects when the recorder does not report recording and cleans it up', async () => {
    const ExpoAudio = require('expo-audio');
    const recorder = {
      uri: null as string | null,
      isRecording: false,
      prepareToRecordAsync: jest.fn(() => Promise.resolve()),
      record: jest.fn(),
      getStatus: jest.fn(() => ({ isRecording: false })),
      stop: jest.fn(() => Promise.resolve()),
      release: jest.fn(),
    };
    ExpoAudio.AudioModule.AudioRecorder.mockImplementation(() => recorder);

    const { audioRecordingBridge } = require('../src/services/nativeBridges');

    await expect(audioRecordingBridge.startRecording()).rejects.toThrow(
      'Recorder did not enter the recording state',
    );
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(recorder.release).toHaveBeenCalledTimes(1);
    expect(ExpoAudio.setAudioModeAsync).toHaveBeenLastCalledWith({ allowsRecording: false });
    await expect(audioRecordingBridge.stopRecording()).resolves.toBeNull();
  });
});
