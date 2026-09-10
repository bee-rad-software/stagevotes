const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

const packageJson = require('../package.json');

if (process.platform !== 'darwin') {
  console.error('Mac releases must be built on macOS.');
  process.exit(1);
}

const outputDirectory = path.join(
  os.homedir(),
  'StageVotesUniversalBuild'
);

const dmgPath = path.join(
  outputDirectory,
  `StageVotes-${packageJson.version}-universal.dmg`
);

function run(command, args) {
  console.log(`\nRunning: ${command} ${args.join(' ')}\n`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run('npx', [
  'electron-builder',
  '--mac',
  '--universal',
  `--config.directories.output=${outputDirectory}`,
]);

run('xcrun', [
  'notarytool',
  'submit',
  dmgPath,
  '--keychain-profile',
  'StageVotes-notary',
  '--wait',
]);

run('xcrun', [
  'stapler',
  'staple',
  dmgPath,
]);

run('xcrun', [
  'stapler',
  'validate',
  dmgPath,
]);

console.log('\nStageVotes universal Mac release is signed, notarized, and stapled.');
console.log(dmgPath);