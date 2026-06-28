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

    expect(attachment).toEqual({
      data: 'iVBORw==',
      mimeType: 'image/png',
      name: 'homework.png',
      type: 'image',
    });
  });
});
