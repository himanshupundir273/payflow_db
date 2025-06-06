import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.payflow.app',
  appName: 'PayFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
    // url: 'http://192.168.26.98:5173'
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'key0',
      keystorePassword: 'password'
    }
  },
  plugins: {
    App: {
      backButtonBehavior: 'history'
    }
  }
};

export default config;