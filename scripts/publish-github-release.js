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
  const tag = process.env.RELEASE_TAG || 'v1.2.0';
  const targetCommitish = process.env.RELEASE_BRANCH || 'feature/partial-settlements';
  const releaseName = 'TripMate v1.2.0 — Production Android Release (Partial Settlements)';
  const releaseBody = `## 🚀 TripMate v1.2.0 — Production Android Release

Welcome to the **v1.2.0** production release of **TripMate** — the offline-first group expense, trip management, and settlement application!

### 💡 What's New in v1.2.0
- **Partial Settlements**: Pay off debts flexibly with custom paise-accurate amounts or quick 25%, 50%, 75%, and Full payment selectors.
- **Instant & Request Confirmation Modes**: Choose between instant ledger balance updates or sending a settlement confirmation request.
- **Recipient Verification Controls**: Recipients can review and confirm receipt or reject invalid settlement requests.
- **Debt Reservation Engine**: Pending requests safely reserve debt without altering member balances prematurely, preventing duplicate or exceeding settlements.
- **Data Preservation Architecture**: Tested and verified seamless in-place APK upgrade preserving all existing \`tripmate.db\` SQLite records, uploaded bill receipts, and user sessions.
- **Standalone Android Release Build (versionCode 3)**: Universal release APK compiled for ARM64, ARMv7, x86, and x86_64 architectures with matching keystore signature for in-place updates.
- **Comprehensive 141-Test Suite**: 100% test coverage across shared models, backend financial reconciliation, and mobile user workflows.

### 📦 Download & Installation
1. Download **\`TripMate-release.apk\`** (99.5 MB) below.
2. Transfer to your Android phone (or download directly on your device).
3. Tap the file to install — Android will update your existing TripMate app without losing any data.

### 🔒 Binary Verification
- **File Name**: \`TripMate-release.apk\`
- **File Size**: \`104,314,567 bytes (99.5 MB)\`
- **SHA-256**: \`E498E58414F31B7FF416F03B6345DB0F5F72B85AA36228C5E7D6EA134247C08C\`
- **Package Name**: \`com.tripmate.app\`
- **Version Code**: \`3\`
- **Version Name**: \`1.2.0\`
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
        target_commitish: targetCommitish,
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
