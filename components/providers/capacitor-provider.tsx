"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

const ROOT_PATHS = ["/", "/dashboard"];

/**
 * Native integration for the Android app. Does nothing in a regular browser.
 */
export function CapacitorProvider() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    SplashScreen.hide().catch(() => {});

    // Hardware back button: exit on the home screen, otherwise go back.
    // The WebView's canGoBack is false after full-page navigations, so it is not used.
    const listener = App.addListener("backButton", () => {
      if (ROOT_PATHS.includes(window.location.pathname)) {
        App.exitApp();
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/dashboard";
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return null;
}
