/* global jest */

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test-device]' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', canAskAgain: true })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(() => Promise.resolve('nonce')),
}));

jest.mock('expo-auth-session', () => {
  const promptAsync = jest.fn(() => Promise.resolve({ type: 'cancel' }));
  return {
    ResponseType: { IdToken: 'id_token' },
    makeRedirectUri: jest.fn(() => 'kitabu://redirect'),
    fetchDiscoveryAsync: jest.fn(() => Promise.resolve({ authorizationEndpoint: 'https://accounts.google.com/auth' })),
    AuthRequest: jest.fn().mockImplementation(config => ({
      config,
      makeAuthUrlAsync: jest.fn(() => Promise.resolve('https://accounts.google.com/auth')),
      promptAsync,
    })),
    __promptAsync: promptAsync,
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ type: 'cancelled', data: null })),
  },
  isSuccessResponse: jest.fn(response => response?.type === 'success'),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(moduleId => ({
      uri: `asset://${moduleId}`,
      localUri: `asset://${moduleId}`,
      downloadAsync: jest.fn(function downloadAsync() {
        return Promise.resolve(this);
      }),
    })),
  },
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    currentTime: 0,
    duration: 0,
    playing: false,
  })),
  createAudioPlayer: jest.fn(() => {
    const listeners = new Map();
    return {
      addListener: jest.fn((eventName, listener) => {
        listeners.set(eventName, listener);
        return {
          remove: jest.fn(() => listeners.delete(eventName)),
        };
      }),
      play: jest.fn(() => {
        listeners.get('playbackStatusUpdate')?.({
          playing: true,
          didJustFinish: false,
        });
      }),
      pause: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      remove: jest.fn(),
      volume: 1,
    };
  }),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  RecordingPresets: {
    HIGH_QUALITY: {},
  },
  AudioModule: {
    AudioRecorder: jest.fn().mockImplementation(() => ({
      uri: 'file:///recording.m4a',
      prepareToRecordAsync: jest.fn(() => Promise.resolve()),
      record: jest.fn(),
      stop: jest.fn(() => Promise.resolve()),
    })),
  },
}));

jest.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: jest.fn((_source, setup) => {
    const player = {
      allowsExternalPlayback: true,
      loop: false,
      play: jest.fn(),
      showNowPlayingNotification: false,
      staysActiveInBackground: false,
    };
    setup?.(player);
    return player;
  }),
}));

jest.mock('expo-screen-capture', () => ({
  usePreventScreenCapture: jest.fn(),
  enableAppSwitcherProtectionAsync: jest.fn(() => Promise.resolve()),
  disableAppSwitcherProtectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

jest.mock('expo-file-system', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
}));
