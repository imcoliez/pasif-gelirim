// npm install sonrası çalışır: Gradle'a "sabit debug imzası + artan sürüm numarası" kuralını kurar.
// Neden: GitHub her derlemede yeni bir geçici debug anahtarı üretiyordu; imzası farklı APK
// telefonda/BlueStacks'te mevcut uygulamanın ÜSTÜNE kurulamıyordu. Bu kural imzayı sabitler.
// (Yalnızca DEBUG anahtarıdır, gizli değildir. Play Store yayını için ayrı bir yükleme anahtarı gerekir.)
const fs = require('fs'), os = require('os'), path = require('path');
const root = path.resolve(__dirname, '..');
const store = path.join(root, 'signing', 'pasif-debug.keystore');
if (!fs.existsSync(store)) { console.log('[imza] signing/pasif-debug.keystore yok, atlandı'); process.exit(0); }
const gh = process.env.GRADLE_USER_HOME || path.join(os.homedir(), '.gradle');
const dir = path.join(gh, 'init.d');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const q = s => "'" + String(s).replace(/\\/g, '/').replace(/'/g, "\\'") + "'";
const gradle = `// Pasif Gelirim: sabit debug imzası ve artan sürüm numarası (tools/setup_signing.js tarafından yazıldı)
allprojects { p ->
  p.afterEvaluate {
    if (p.plugins.hasPlugin('com.android.application')) {
      try {
        def a = p.extensions.getByName('android')
        def run = (System.getenv('GITHUB_RUN_NUMBER') ?: '1').toInteger()
        a.defaultConfig.versionCode = 100 + run
        a.defaultConfig.versionName = ${q(pkg.version)} + '.' + run
        def dbg = a.signingConfigs.getByName('debug')
        dbg.storeFile = new File(${q(store)})
        dbg.storePassword = 'android'
        dbg.keyAlias = 'androiddebugkey'
        dbg.keyPassword = 'android'
        println '[imza] sabit debug anahtari, versionCode=' + a.defaultConfig.versionCode
      } catch (Throwable e) { println '[imza] uygulanamadi: ' + e }
    }
  }
}
`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'pasif-imza.gradle'), gradle);
console.log('[imza] yazildi: ' + path.join(dir, 'pasif-imza.gradle'));
