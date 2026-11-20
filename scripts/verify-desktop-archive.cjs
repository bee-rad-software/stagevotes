const assert = require('node:assert/strict');
const vm = require('node:vm');
const asar = require('@electron/asar');
const expectedVersion = require('../package.json').version;

function verifyDesktopArchive(archive) {
  const read = name => asar.extractFile(archive, name).toString('utf8');
  assert.equal(JSON.parse(read('package.json')).version, expectedVersion, 'Packaged app version must match the release');
  let bridge;
  const calls = [];
  vm.runInNewContext(read('electron-preload.js'), {
    require(name) {
      assert.equal(name, 'electron');
      return {
        contextBridge: { exposeInMainWorld(name, api) { assert.equal(name, 'stagevotesDesktop'); bridge = api; } },
        ipcRenderer: { invoke: (...args) => calls.push(args) },
      };
    },
  }, { timeout: 1000 });
  assert.equal(bridge?.isDesktop, true);
  assert.equal(typeof bridge.setStagePresentation, 'function', 'Installer is missing automatic window handoff');
  bridge.setStagePresentation('front');
  assert.deepEqual(calls[0], ['stage-presentation', 'front']);
  assert.equal(typeof bridge.listStageDisplays, 'function');
  assert.equal(typeof bridge.fillStageTV, 'function');
  assert.match(read('electron-karafun-display.js'), /ipcMain\.handle\(["']stage-presentation["']/,
    'Installer is missing the native handoff handler');
  console.log(`Verified desktop ${expectedVersion}: handoff and TV controls packaged.`);
}

module.exports = { verifyDesktopArchive };
if (require.main === module) {
  if (!process.argv[2]) throw Error('Pass the path to the packaged app.asar');
  verifyDesktopArchive(process.argv[2]);
}
