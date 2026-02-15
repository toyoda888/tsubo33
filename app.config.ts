import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "つぼ３３",
  slug: "tsubo33",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "tsubo33",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FDF8FA"
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
    template: "./web-template.html",
    config: {
      firebase: {
        apiKey: undefined,
        authDomain: undefined,
        projectId: undefined,
      },
    },
    meta: {
      name: "つぼ３３ - ツボ学習アプリ",
      description: "楽しく学べる経穴（ツボ）学習アプリ。日常モード、復習モード、サバイバルモードなど多彩なゲームモードで東洋医学の知識を身につけよう！",
      themeColor: "#FFB6D9",
    },
    manifest: {
      name: "つぼ３３ - 経穴学習アプリ",
      short_name: "つぼ３３",
      description: "楽しく学べる経穴（ツボ）学習アプリ。日常モード、復習モード、サバイバルモードなど多彩なゲームモードで東洋医学の知識を身につけよう！",
      display: "standalone",
      orientation: "portrait",
      backgroundColor: "#FDF8FA",
      theme_color: "#FFB6D9",
      icons: [
        {
          src: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      categories: ["education", "health", "lifestyle"],
      lang: "ja",
      dir: "ltr",
      prefer_related_applications: false,
      start_url: "/",
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FDF8FA",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;

