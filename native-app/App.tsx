import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KitabuApp } from './src/KitabuApp';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <KitabuApp />
    </SafeAreaProvider>
  );
}

export default App;
