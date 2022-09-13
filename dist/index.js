"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_1 = __importDefault(require("webpack"));
const helpers_1 = require("./utils/helpers");
const compileHandler_1 = __importDefault(require("./compiler/compileHandler"));
const ProgressLogger_1 = require("./logger/ProgressLogger");
/**
 * @class WebpackDeploySshPlugin
 * @extends Object
 * A Webpack plugin that makes it easier to deploy bundles to remote machines,
 * and display OS-level notifications for both Webpack build and SSH actions events.
 */
class WebpackDeploySshPlugin {
    // constructor
    constructor(options = {}) {
        this.hideStartingStats = false;
        this.options = Object.assign({ color: true, name: 'Ev Apps Bundling: Starting ...' }, options);
        if (!(0, helpers_1.isPlainObject)(options)) {
            throw new Error(`Webpack-Deploy-Ssh-Plugin only accepts an options object. See:
            https://github.com/younesBarhouni/webpack-deploy-ssh-plugin#options-and-defaults-optional`);
        }
        this.pluginName = 'Webpack-Deploy-Ssh-Plugin';
        this.displayNotifications = true;
        options = Object.assign(Object.assign({}, this), options);
        //
        this.compileHandler = new compileHandler_1.default(options);
        this.startCompile = true;
        this.remoteOutput = options.remoteOutput || '';
        this.webpackInstance = options.webpackInstance || webpack_1.default;
    }
    /**
     * hook factory
     * @param compiler
     * @param hookName
     * @param fn
     * @private
     */
    hook(compiler, hookName, function_) {
        compiler.hooks[hookName].tap(`${this.pluginName}:${hookName}`, function_);
    }
    /**
     * apply
     * @param compiler
     */
    apply(compiler) {
        if (compiler.hooks && compiler.hooks.watchRun && compiler.hooks.done) {
            // for webpack >= 4
            if (!this.hideStartingStats) {
                compiler.hooks.watchRun.tapAsync(this.pluginName, (comp, callback) => {
                    this.compileHandler.onCompilationWatchRun(comp, callback);
                });
            }
            this.hook(compiler, 'done', (stats) => this.compileHandler.onCompilationDone(stats));
            this.hook(compiler, 'afterDone', (stats) => this.compileHandler.collectAssets(stats));
            this.hook(compiler, 'assetEmitted', (file, { source }) => this.compileHandler.onAssetsEmitted(file, source));
        }
        else {
            // for webpack < 4
            this.compileHandler.displayNotSupportedWebpackVersion();
        }
        // const { beforeEmit } = this.options.getCompilerHooks(compiler);
        // beforeEmit.tap(this.pluginName, (manifest) => {
        //   return { ...manifest, uuid: createUUID() };
        // });
        // Run the progressLogger
        const progressLogger = new ProgressLogger_1.ProgressLogger(this.options);
        return progressLogger.apply(compiler);
    }
}
exports.default = WebpackDeploySshPlugin;
module.exports = WebpackDeploySshPlugin;
//# sourceMappingURL=index.js.map