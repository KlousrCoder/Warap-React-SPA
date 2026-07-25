import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.warap.connect",
  appName: "Warap",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    App: {
      appUrlOpen: true,
    },
  },
};

export default config;
