const fs = require('fs');
const path = require('path');

const robotsTxt = `# 検索エンジンのクローリングを拒否
User-agent: *
Disallow: /
# Sitemap は提供しない
`;

const distPath = path.join(__dirname, '..', 'dist');
const robotsPath = path.join(distPath, 'robots.txt');

// dist フォルダが存在するか確認
if (fs.existsSync(distPath)) {
  fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
  console.log('✅ robots.txt を dist/ に作成しました');
} else {
  console.error('❌ dist/ フォルダが見つかりません');
}
