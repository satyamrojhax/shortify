import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cc.cd.lfrdcatechnologies.shortify',
  appName: 'Shortify',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      showSpinner: false,
    },
  },
  android: {
    path: 'android_v6'
  }
};

export default config;
