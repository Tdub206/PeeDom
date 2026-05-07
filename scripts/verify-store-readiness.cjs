const fs = require('fs');
const https = require('https');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const checkUrls = process.argv.includes('--check-urls');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: ${error instanceof Error ? error.message : 'Unable to read JSON file.'}`);
    return null;
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
    return '';
  }

  return value.trim();
}

function assertLength(value, label, minimum, maximum) {
  const text = assertString(value, label);
  if (!text) {
    return;
  }

  if (text.length < minimum || text.length > maximum) {
    fail(`${label} must be between ${minimum} and ${maximum} characters; received ${text.length}.`);
  }
}

function assertMaximumLength(value, label, maximum) {
  const text = assertString(value, label);
  if (!text) {
    return;
  }

  if (text.length > maximum) {
    fail(`${label} must be ${maximum} characters or fewer; received ${text.length}.`);
  }
}

function assertHttpsUrl(value, label) {
  const text = assertString(value, label);
  if (!text) {
    return;
  }

  let url;
  try {
    url = new URL(text);
  } catch (_error) {
    fail(`${label} must be a valid URL.`);
    return;
  }

  if (url.protocol !== 'https:') {
    fail(`${label} must use https.`);
  }
}

function readPngInfo(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`${relativePath} is missing.`);
    return null;
  }

  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    fail(`${relativePath} is not a PNG file.`);
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  let hasTransparencyChunk = false;
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (chunkType === 'tRNS') {
      hasTransparencyChunk = true;
    }

    offset += chunkLength + 12;
    if (chunkType === 'IEND') {
      break;
    }
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk,
  };
}

function assertPng(relativePath, expectedWidth, expectedHeight, requiresNoAlpha) {
  const info = readPngInfo(relativePath);
  if (!info) {
    return;
  }

  if (info.width !== expectedWidth || info.height !== expectedHeight) {
    fail(`${relativePath} must be ${expectedWidth}x${expectedHeight}; received ${info.width}x${info.height}.`);
  }

  if (info.bitDepth !== 8) {
    fail(`${relativePath} must be 8-bit PNG; received bit depth ${info.bitDepth}.`);
  }

  if (requiresNoAlpha && info.hasAlpha) {
    fail(`${relativePath} must be a PNG without alpha transparency.`);
  }
}

function assertScreenshotSet(label, set, expectedCount, requiresNoAlpha) {
  if (!set || !Array.isArray(set.paths)) {
    fail(`${label} must define a screenshot path list.`);
    return;
  }

  if (set.paths.length !== expectedCount) {
    fail(`${label} must include ${expectedCount} screenshots; received ${set.paths.length}.`);
  }

  for (const screenshotPath of set.paths) {
    assertPng(screenshotPath, set.width, set.height, requiresNoAlpha);
  }
}

function validateAppleMetadata(storeConfig) {
  const apple = storeConfig && storeConfig.apple;
  if (!apple || typeof apple !== 'object') {
    fail('store.config.json must define apple metadata.');
    return;
  }

  if (storeConfig.configVersion !== 0) {
    fail('store.config.json configVersion must be 0.');
  }

  const info = apple.info && apple.info['en-US'];
  if (!info || typeof info !== 'object') {
    fail('store.config.json must define apple.info.en-US.');
    return;
  }

  assertLength(info.title, 'Apple title', 2, 30);
  assertMaximumLength(info.subtitle, 'Apple subtitle', 30);
  assertLength(info.description, 'Apple description', 10, 4000);
  assertMaximumLength(info.releaseNotes, 'Apple release notes', 4000);
  assertMaximumLength(info.promoText, 'Apple promo text', 170);
  assertHttpsUrl(info.marketingUrl, 'Apple marketing URL');
  assertHttpsUrl(info.supportUrl, 'Apple support URL');
  assertHttpsUrl(info.privacyPolicyUrl, 'Apple privacy policy URL');
  assertHttpsUrl(info.privacyChoicesUrl, 'Apple privacy choices URL');

  if (!Array.isArray(info.keywords) || info.keywords.length === 0) {
    fail('Apple keywords must be a non-empty array.');
  } else {
    const keywordText = info.keywords.join(',');
    if (new Set(info.keywords).size !== info.keywords.length) {
      fail('Apple keywords must be unique.');
    }
    if (keywordText.length > 100) {
      fail(`Apple keywords must be 100 characters or fewer when comma-joined; received ${keywordText.length}.`);
    }
  }

  if (!Array.isArray(apple.categories) || !apple.categories.includes('UTILITIES')) {
    fail('Apple categories must include UTILITIES.');
  }
}

function validateGoogleMetadata(googleMetadata) {
  if (!googleMetadata || typeof googleMetadata !== 'object') {
    fail('Google Play metadata must be a JSON object.');
    return;
  }

  assertString(googleMetadata.appName, 'Google Play app name');
  if (googleMetadata.packageName !== 'com.stallpass.app') {
    fail('Google Play packageName must be com.stallpass.app.');
  }

  const contact = googleMetadata.contact || {};
  assertString(contact.email, 'Google Play support email');
  assertHttpsUrl(contact.website, 'Google Play website');
  assertHttpsUrl(contact.privacyPolicy, 'Google Play privacy policy URL');

  const listing = googleMetadata.listing || {};
  assertMaximumLength(listing.shortDescription, 'Google Play short description', 80);
  assertLength(listing.fullDescription, 'Google Play full description', 80, 4000);

  const graphics = googleMetadata.graphics || {};
  if (!graphics.featureGraphic || !graphics.appIcon || !Array.isArray(graphics.phoneScreenshots)) {
    fail('Google Play graphics must define appIcon, featureGraphic, and phoneScreenshots.');
  }

  const altText = graphics.altText || {};
  for (const [assetPath, text] of Object.entries(altText)) {
    assertMaximumLength(text, `Google Play alt text for ${assetPath}`, 140);
  }
}

function validateAssets(assetMap) {
  const apple = assetMap && assetMap.apple;
  const googlePlay = assetMap && assetMap.googlePlay;
  if (!apple || !googlePlay) {
    fail('store-metadata/asset-map.json must define apple and googlePlay assets.');
    return;
  }

  assertPng(apple.appIcon.path, apple.appIcon.width, apple.appIcon.height, apple.appIcon.requiresNoAlpha);
  assertScreenshotSet('Apple 6.9-inch screenshots', apple.iphone69Screenshots, 8, true);
  assertScreenshotSet('Apple 6.5-inch screenshots', apple.iphone65Screenshots, 8, true);
  assertScreenshotSet('Apple 5.5-inch screenshots', apple.iphone55Screenshots, 8, true);

  assertPng(
    googlePlay.appIcon.path,
    googlePlay.appIcon.width,
    googlePlay.appIcon.height,
    googlePlay.appIcon.requiresNoAlpha
  );
  assertPng(
    googlePlay.featureGraphic.path,
    googlePlay.featureGraphic.width,
    googlePlay.featureGraphic.height,
    googlePlay.featureGraphic.requiresNoAlpha
  );
  assertScreenshotSet(
    'Google Play phone screenshots',
    googlePlay.phoneScreenshots,
    8,
    googlePlay.phoneScreenshots.requiresNoAlpha
  );
}

function uniqueUrls(storeConfig, googleMetadata) {
  const info = storeConfig.apple.info['en-US'];
  const contact = googleMetadata.contact;
  const dataDeletion = googleMetadata.dataSafetySummary && googleMetadata.dataSafetySummary.dataDeletion;
  const urls = [
    info.marketingUrl,
    info.supportUrl,
    info.privacyPolicyUrl,
    info.privacyChoicesUrl,
    contact.website,
    contact.privacyPolicy,
  ];

  if (typeof dataDeletion === 'string') {
    const match = dataDeletion.match(/https:\/\/[^\s.]+(?:\.[^\s.]+)+(?:\/[^\s.]*)?/);
    if (match) {
      urls.push(match[0]);
    }
  }

  return [...new Set(urls)];
}

function requestStatus(url, method) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method, timeout: 15000 }, (response) => {
      response.resume();
      resolve(response.statusCode || 0);
    });

    request.on('timeout', () => {
      request.destroy(new Error(`Timed out while checking ${url}.`));
    });
    request.on('error', reject);
    request.end();
  });
}

async function validateUrls(storeConfig, googleMetadata) {
  for (const url of uniqueUrls(storeConfig, googleMetadata)) {
    try {
      let status = await requestStatus(url, 'HEAD');
      if (status === 405) {
        status = await requestStatus(url, 'GET');
      }
      if (status < 200 || status >= 400) {
        fail(`${url} must be live before store submission; received HTTP ${status}.`);
      }
    } catch (error) {
      fail(`${url} must be live before store submission; ${error instanceof Error ? error.message : 'request failed'}`);
    }
  }
}

async function main() {
  const storeConfig = readJson('store.config.json');
  const googleMetadata = readJson('store-metadata/google-play/en-US.json');
  const assetMap = readJson('store-metadata/asset-map.json');

  if (storeConfig) {
    validateAppleMetadata(storeConfig);
  }
  if (googleMetadata) {
    validateGoogleMetadata(googleMetadata);
  }
  if (assetMap) {
    validateAssets(assetMap);
  }
  if (checkUrls && storeConfig && googleMetadata) {
    await validateUrls(storeConfig, googleMetadata);
  }

  if (failures.length > 0) {
    console.error('Store readiness check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Store readiness check passed${checkUrls ? ' with hosted URL verification' : ''}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
