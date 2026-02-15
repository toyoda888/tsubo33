# つぼみさん - Web版

WHO認定361個の経穴（ツボ）を楽しく覚えられるクイズ学習Webアプリ

## 特徴

- 🎯 361個の経穴（ツボ）データ完全収録
- 📱 スマホ最適化（iPhone対応）
- 💾 ローカルストレージでデータ保存
- 🎨 パステルピンク基調のおしゃれなデザイン
- ⚡ スリープモードなし（24/7稼働）

## 技術スタック

- React Native Web
- Expo Router 6
- TypeScript
- NativeWind 4 (Tailwind CSS)
- React Native Reanimated

## 開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド（本番用）
npm run build

# ビルドプレビュー
npm run preview
```

## デプロイ

### Vercelにデプロイ

```bash
# Vercel CLIインストール
npm install -g vercel

# ビルド
npm run build

# デプロイ
vercel --prod
```

### その他のホスティング

ビルド後の `dist` フォルダを以下にアップロード:
- Netlify
- Cloudflare Pages
- GitHub Pages
- Firebase Hosting

## PWA対応

ホーム画面に追加することで、アプリのように使用できます：

### iPhoneの場合
1. Safariでアクセス
2. 共有ボタンをタップ
3. 「ホーム画面に追加」を選択

### Androidの場合
1. Chromeでアクセス
2. メニューから「ホーム画面に追加」を選択

## データ保存

すべてのデータはブラウザのlocalStorageに保存されます：
- 学習進捗
- ゲーム履歴
- 習得済みツボリスト
- 身分ランク

## ライセンス

Private
