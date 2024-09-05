'use strict';

const pacote = require('pacote');

const Config = require('@npmcli/config');
const { resolve } = require('path');
const { shorthands, definitions, flatten } = require('@npmcli/config/lib/definitions');

const conf = new Config({
  npmPath: resolve(__dirname, '..'),
  definitions,
  shorthands,
  flatten
});

let confPromise = null;

function loadConfigOnce() {
  if (confPromise) {
    return confPromise;
  }
  confPromise = conf.load().then(() => conf);
  return confPromise;
}

// npm configs that overlap with pacote
// https://docs.npmjs.com/cli/v10/using-npm/config#before
// https://github.com/npm/pacote?tab=readme-ov-file#options
let pacoteConfigProps = [
  'cache',
  'umask',
  'before',
  'registry'

  // TODO: these would need to be converted to kebab case
  // 'preferOffline', 
  // 'preferOnline',
];

function has(obj, propName) {
  return Object.prototype.hasOwnProperty.call(obj, propName);
}

/**
 * Set whatever config pacote can handle
 * @param {*} opts
 * @param {*} npmConfig
 */
function updatePacoteOptsWithNpmConfig(opts, npmConfig) {
  for (let propName of pacoteConfigProps) {
    let npmValue = npmConfig.get(propName);

    // only set defaults
    if (!has(npmConfig.defaults, propName) ||
      // ignore values that are already npm defaults
      npmValue === npmConfig.defaults[propName]) {
      continue;
    }
    opts = opts ? opts : {};
    // don't modify passed opts
    if (!has(opts, propName)) {
      opts[propName] = npmValue;
      // console.log(`setting ${propName} to ${npmValue}`);
    }
  }
}

/**
 * Before any call is made, we fetch the npm config
 * and update the opts arg of the pacote functions.
 */
function wrapTwoArgs(pacoteMethod) {
  return (spec, opts) => {
    return loadConfigOnce().then((npmConfig) => {
      updatePacoteOptsWithNpmConfig(opts, npmConfig);
      return pacoteMethod(spec, opts);
    });
  };
}

function wrapThreeArgs(pacoteMethod) {
  return (spec, anything, opts) => {
    return loadConfigOnce().then((npmConfig) =>{
      updatePacoteOptsWithNpmConfig(opts, npmConfig);
      return pacoteMethod(spec, anything, opts);
    });
  };
}

module.exports = {
  // GitFetcher: pacote.GitFetcher,
  // RegistryFetcher: pacote.RegistryFetcher,
  // FileFetcher: pacote.FileFetcher,
  // DirFetcher: pacote.DirFetcher,
  // RemoteFetcher: pacote.RemoteFetcher,
  resolve: wrapTwoArgs(pacote.resolve),
  extract: wrapThreeArgs(pacote.extract),
  manifest: wrapTwoArgs(pacote.manifest),
  tarball: wrapTwoArgs(pacote.tarball),
  packument: wrapTwoArgs(pacote.packument)
};

module.exports.tarball.stream = wrapThreeArgs(pacote.tarball.stream);
module.exports.tarball.file = wrapThreeArgs(pacote.tarball.file);
