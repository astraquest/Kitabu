import 'react-native';

declare module 'react-native' {
  namespace StyleSheet {
    /** Compatibility alias removed from RN 0.86 typings; the runtime shape is unchanged. */
    const absoluteFillObject: {
      position: 'absolute';
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
    };
  }
}
