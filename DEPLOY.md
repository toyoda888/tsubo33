# つぼみさんアプリ - Vercelデプロイガイド

## 前提条件
- GitHubアカウント
- Vercelアカウント（GitHubでログイン可能）

## デプロイ手順

### 方法1: GitHub経由（推奨）

1. **GitHubにリポジトリを作成**
   - https://github.com/new にアクセス
   - リポジトリ名: `tsubomisan-app`
   - プライベートを選択（推奨）

2. **コードをプッシュ**
   ```bash
   cd tsubomisan-web
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/tsubomisan-app.git
   git push -u origin main
   ```

3. **Vercelでインポート**
   - https://vercel.com にアクセス
   - "Add New Project" をクリック
   - GitHubリポジトリを選択
   - "Deploy" をクリック

4. **完了！**
   - 数分後にURLが発行されます
   - 例: `https://tsubomisan-app.vercel.app`

### 方法2: Vercel CLI

```bash
# Vercel CLIインストール
npm install -g vercel

# プロジェクトディレクトリで実行
cd tsubomisan-web
vercel

# 初回のみ質問に答える
# - Set up and deploy: Yes
# - Which scope: 自分のアカウント
# - Link to existing project: No
# - Project name: tsubomisan-app
# - Directory: ./
# - Override settings: No

# 本番デプロイ
vercel --prod
```

## デプロイ後の確認

1. **URLを開く**
   - VercelダッシュボードでURLを確認
   - スマホでアクセスしてテスト

2. **PWA機能テスト**
   - iPhoneの場合: 「ホーム画面に追加」
   - Androidの場合: 「ホーム画面に追加」

3. **データ保存テスト**
   - クイズをプレイ
   - ブラウザを閉じる
   - 再度開いて進捗が保存されているか確認

## カスタムドメイン設定（オプション）

1. Vercelダッシュボードで "Settings" > "Domains"
2. ドメインを追加
3. DNSレコードを設定

## トラブルシューティング

### ビルドエラーの場合
```bash
# ローカルでビルドテスト
npm run build

# エラーがある場合は修正してから再デプロイ
```

### 画面が真っ白の場合
- ブラウザのコンソールでエラーを確認
- キャッシュをクリアして再読み込み

## 更新方法

### GitHub経由の場合
```bash
# コード修正後
git add .
git commit -m "Update"
git push

# 自動的に再デプロイされます
```

### Vercel CLI経由の場合
```bash
vercel --prod
```

## 知り合いへの共有

デプロイ後、URLを共有するだけでOKです：
- スリープモードなし
- いつでもアクセス可能
- インストール不要（PWAとして保存可能）

例:
```
つぼみさんアプリができました！
https://tsubomisan-app.vercel.app

iPhoneの場合:
Safariで開いて「ホーム画面に追加」すると
アプリみたいに使えます🌸
```
