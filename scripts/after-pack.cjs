const { execFileSync } = require('child_process');
const path = require('path');
const { verifyDesktopArchive } = require('./verify-desktop-archive.cjs');

exports.default = async function afterPack(context) {
  const appDirectory = context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app', 'Contents')
    : context.appOutDir;
  verifyDesktopArchive(path.join(appDirectory, context.electronPlatformName === 'darwin' ? 'Resources' : 'resources', 'app.asar'));
  if (context.electronPlatformName !== 'darwin') return;

  console.log('Removing macOS provenance metadata before signing…');

  execFileSync(
    '/usr/bin/xattr',
    ['-dr', 'com.apple.provenance', context.appOutDir],
    { stdio: 'inherit' }
  );

  execFileSync(
    '/usr/bin/xattr',
    ['-cr', context.appOutDir],
    { stdio: 'inherit' }
  );
};