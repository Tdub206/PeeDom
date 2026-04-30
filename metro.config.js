const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

const excludedDirectories = [
  '.agents',
  '.claude',
  '.codex',
  '.eas',
  '.expo',
  '.firebase',
  '.git',
  '.github',
  '.idea',
  '.stallpass-ai',
  '_preflight',
  'agent',
  'android',
  'apps',
  'debug',
  'docs',
  'plugins',
  'public',
  'PublicRestroomData',
  'StallPass_App_Store_Assets',
  'web',
];

function escapeForRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

config.resolver.blockList = new RegExp(
  excludedDirectories
    .map((directoryName) => {
      const normalizedDirectoryPath = escapeForRegex(path.join(__dirname, directoryName));
      return `^${normalizedDirectoryPath}(?:[\\\\/].*)?$`;
    })
    .join('|')
);

module.exports = withNativeWind(config, { input: './global.css' });
