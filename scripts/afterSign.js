// electron-builder afterSign hook.
// We don't have an Apple Developer ID cert, so electron-builder's own ad-hoc
// signing sometimes leaves a broken seal (nested helper apps signed before
// the outer bundle is finalized), which makes macOS show "app is damaged"
// instead of the normal bypassable "unidentified developer" prompt.
// Re-signing the whole bundle ad-hoc, deep, as the very last step guarantees
// a self-consistent signature that passes `codesign --verify`.
const { execSync } = require('child_process');

module.exports = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`;
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
  execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'inherit' });
};
