const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withCustomWebIndex(config) {
  return withDangerousMod(config, [
    'web',
    async (config) => {
      const indexPath = path.join(config.modRequest.projectRoot, 'web', 'index.html');
      
      // index.html が存在する場合のみ処理
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // manifest タグがなければ追加
        if (!html.includes('rel=\"manifest\"')) {
          const manifestTags = \
  <!-- PWA Manifest -->
  <link rel=\"manifest\" href=\"/manifest.json\" />
  <meta name=\"theme-color\" content=\"#FFB6D9\" />
  
  <!-- Apple Touch Icon -->
  <link rel=\"apple-touch-icon\" href=\"/icons/icon-192x192.png\" />
  <meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />
  <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\" />
  <meta name=\"apple-mobile-web-app-title\" content=\"つぼ３３\" />
\;
          
          html = html.replace('</head>', manifestTags + '\n</head>');
          fs.writeFileSync(indexPath, html, 'utf8');
        }
      }
      
      return config;
    },
  ]);
};
