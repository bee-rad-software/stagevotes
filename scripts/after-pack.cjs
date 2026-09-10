const { execFileSync } = require('child_process');

exports.default = async function afterPack(context) {
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