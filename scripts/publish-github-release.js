const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitToken() {
  const output = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n', encoding: 'utf8' });
  const match = output.match(/password=(.+)/);
  if (!match) {
    throw new Error('Could not retrieve GitHub token from git credentials');
  }
  return match[1].trim();
}

async function githubRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'TripMate-Release-Script',
        'Authorization': `token ${options.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(options.headers || {})
      }
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`GitHub API Error ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', reject);

    if (data) {
      if (Buffer.isBuffer(data)) {
        req.write(data);
      } else if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function uploadAsset(uploadUrlTemplate, filePath, fileName, token) {
  const uploadUrl = uploadUrlTemplate.replace('{?name,label}', `?name=${encodeURIComponent(fileName)}`);
  const parsedUrl = new URL(uploadUrl);
  const fileStat = fs.statSync(filePath);
  const fileSize = fileStat.size;

  console.log(`[Upload] Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'TripMate-Release-Script',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileSize
      }
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`[Upload] Asset uploaded successfully! Status: ${res.statusCode}`);
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Upload failed with HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    let bytesUploaded = 0;
    let lastLoggedPercent = 0;
    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
    stream.on('data', chunk => {
      bytesUploaded += chunk.length;
      const percent = Math.floor((bytesUploaded / fileSize) * 100);
      if (percent - lastLoggedPercent >= 10 || percent === 100) {
        console.log(`[Upload Progress] ${percent}% (${(bytesUploaded / (1024 * 1024)).toFixed(1)} / ${(fileSize / (1024 * 1024)).toFixed(1)} MB)`);
        lastLoggedPercent = percent;
      }
    });
    stream.pipe(req);
  });
}

async function main() {
  const token = getGitToken();
  const repo = 'YashSurve2006/tripmate';
  const tag = 'v1.1.0';
  const releaseName = 'TripMate v1.1.0 — Production Android Release';
  const releaseBody = `## 🚀 TripMate v1.1.0 — Production Android Release

Welcome to the **v1.1.0** production release of **TripMate** — the offline-first group expense and trip management application!

### ✨ What's New in v1.1.0
- **Custom Amount-Wise Expense Splitting**: Full support for custom split allocations across members with real-time paise balance validation, visual remaining indicator badges, percentage / shares breakdown, and zero-share member exclusion.
- **Dynamic Group Member Management**: Add members on-the-fly directly by name without invite codes or phone barriers; edit roles, nicknames, and contact info; and safely archive historical transaction participants without corrupting balance audits.
- **Safe Group Deletion & Record Cleanup**: Cascading deletion dialog allowing users to wipe group expenses, splits, and attached documents while strictly safeguarding global user profiles and other groups.
- **WhatsApp Bill Splitting & Settlement Reminders**: One-tap WhatsApp breakdown sharing (\`wa.me/\` deep linking) with dynamic emoji formatting, amount calculations, and international phone number normalization (E.164 and Indian 10-digit formats).
- **Official Brand App Launcher Icons**: High-resolution branded Android adaptive launcher icons (foreground + background layers) and iOS icons configured from official brand assets.
- **Standalone Android Release Build (versionCode 2)**: Universal APK compiled for ARM64, ARMv7, x86, and x86_64 architectures with Hermes AOT compilation.
- **Comprehensive 97-Test Suite**: 100% test coverage across financial calculations, minor-unit arithmetic, and end-to-end user workflows.

### 📥 Download & Installation
1. Download **\`TripMate-release.apk\`** (99.5 MB) below.
2. Transfer to your Android device (or download directly via Chrome/Firefox on Android).
3. Tap the file to install (enable *Install Unknown Apps* in Android settings if prompted).

### 🔐 Binary Verification
- **File Name**: \`TripMate-release.apk\`
- **File Size**: \`104,288,031 bytes (99.5 MB)\`
- **SHA-256**: \`EEA088C4F2269211869020B2B56EC2125DFA722033EBDFA70597AB3DD09CE996\`
- **Target OS**: Android 8.0+ (API 26–36)

---
*Built with React Native 0.88 & Expo SDK 58 • Hermes Engine • 100% Offline SQLite*`;

  console.log(`[Release] Checking if release ${tag} exists on ${repo}...`);
  let release;
  try {
    release = await githubRequest(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { token });
    console.log(`[Release] Existing release found (ID: ${release.id})`);
  } catch (err) {
    if (err.message.includes('404')) {
      console.log(`[Release] Release ${tag} does not exist yet. Creating...`);
      release = await githubRequest(`https://api.github.com/repos/${repo}/releases`, {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' }
      }, {
        tag_name: tag,
        target_commitish: 'main',
        name: releaseName,
        body: releaseBody,
        draft: false,
        prerelease: false
      });
      console.log(`[Release] Created release successfully! ID: ${release.id}`);
    } else {
      throw err;
    }
  }

  const apkPath = path.resolve(__dirname, '..', 'TripMate-release.apk');
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK not found at ${apkPath}`);
  }

  // Check if asset already exists in release
  const existingAsset = (release.assets || []).find(a => a.name === 'TripMate-release.apk');
  if (existingAsset) {
    console.log(`[Release] Existing asset found (ID: ${existingAsset.id}). Deleting to replace with latest build...`);
    await githubRequest(`https://api.github.com/repos/${repo}/releases/assets/${existingAsset.id}`, {
      method: 'DELETE',
      token
    });
    console.log(`[Release] Deleted old asset.`);
  }

  console.log(`[Release] Uploading latest APK to release ${tag}...`);
  const uploaded = await uploadAsset(release.upload_url, apkPath, 'TripMate-release.apk', token);
  console.log(`[Release] 🎉 Release asset uploaded: ${uploaded.browser_download_url}`);
  console.log(`\n======================================================`);
  console.log(`🚀 Release Published Successfully!`);
  console.log(`URL: ${release.html_url}`);
  console.log(`APK Download: ${uploaded.browser_download_url}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('[Release Error]', err);
  process.exit(1);
});
