// Integrasi Capacitor (Android/iOS): status bar, splash, tombol back Android. Di web semua no-op. (sama dengan BVRooms app)
import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // web | android | ios

export async function initNative(onBack: () => boolean) {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    if (platform === "android") await StatusBar.setBackgroundColor({ color: "#F5F7FA" });
  } catch {
    // plugin tidak tersedia
  }
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", () => {
      // onBack() true = sudah ditangani (navigasi mundur); false = di root → keluar app
      if (!onBack()) App.exitApp();
    });
  } catch {
    // plugin tidak tersedia
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // plugin tidak tersedia
  }
}

/** Buka URL eksternal (Google Maps, WhatsApp). Di native WebView, target _system membuka app terkait. */
export function openExternal(url: string) {
  window.open(url, isNative ? "_system" : "_blank", "noopener");
}
