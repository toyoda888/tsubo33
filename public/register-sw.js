@"
// Service Worker 登録 + Manifest 動的追加

// Manifest タグを動的に追加
if (!document.querySelector('link[rel="manifest"]')) {
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = '/manifest.json';
  document.head.appendChild(manifestLink);
  console.log('✅ Manifest タグを動的に追加しました');
}

// Theme Color を追加
if (!document.querySelector('meta[name="theme-color"]')) {
  const themeColor = document.createElement('meta');
  themeColor.name = 'theme-color';
  themeColor.content = '#FFB6D9';
  document.head.appendChild(themeColor);
}

// Apple Touch Icon を追加
if (!document.querySelector('link[rel="apple-touch-icon"]')) {
  const appleIcon = document.createElement('link');
  appleIcon.rel = 'apple-touch-icon';
  appleIcon.href = '/icons/icon-192x192.png';
  document.head.appendChild(appleIcon);
}

// Apple Mobile Web App メタタグ
const appleMeta = [
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  { name: 'apple-mobile-web-app-title', content: 'つぼ３３' }
];

appleMeta.forEach(meta => {
  if (!document.querySelector('meta[name="' + meta.name + '"]')) {
    const metaTag = document.createElement('meta');
    metaTag.name = meta.name;
    metaTag.content = meta.content;
    document.head.appendChild(metaTag);
  }
});

// Service Worker 登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker 登録成功:', registration.scope);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 新しい Service Worker が見つかりました');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 新しいバージョンが利用可能です。リロードしてください。');
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker 登録失敗:', error);
      });
  });
  
  // Service Worker の更新を確認（1時間ごと）
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update();
      }
    });
  }, 60 * 60 * 1000);
}

// インストールプロンプトの処理
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 インストールプロンプトが表示可能です');
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA がホーム画面に追加されました！');
  deferredPrompt = null;
});
"@ | Out-File -FilePath "E:\Genspark\tsubomisan-web\public\register-sw.js" -Encoding UTF8 -NoNewline

Write-Host "✅ register-sw.js を更新しました！" -ForegroundColor Green
