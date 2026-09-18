import type { CapacitorConfig } from "@capacitor/cli";

// BuildingVision Tenant native shell (Android/iOS) membungkus build PWA di dist/. API dipanggil absolut lewat VITE_API_BASE
// (set di .env saat `npm run cap:sync`). Skema http://localhost (Android) & capacitor://localhost (iOS) harus ada di
// BV_CORS_ORIGINS backend. Android Play Store dapat juga memakai TWA di twa/ (Bubblewrap) bila PWA sudah di-host HTTPS.
const config: CapacitorConfig = {
  appId: "id.buildingvision.tenant",
  appName: "BV Tenant",
  webDir: "dist",
  // Android 15 edge-to-edge: tanpa ini WebView menempel di bawah status bar / tertutup navigation bar.
  android: { allowMixedContent: false, backgroundColor: "#F5F7FA", adjustMarginsForEdgeToEdge: "auto" },
  ios: { contentInset: "automatic", backgroundColor: "#F5F7FA" },
  plugins: {
    SplashScreen: { launchShowDuration: 800, launchAutoHide: true, backgroundColor: "#F5F7FA", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#F5F7FA" },
  },
};

export default config;
