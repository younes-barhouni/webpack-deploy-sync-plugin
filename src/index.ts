import { Options } from './types';
import webpack, {Compiler} from 'webpack';
import {isPlainObject} from './utils/helpers';
import CompileHandler from './compiler/compileHandler';
import {ProgressLogger} from './logger/ProgressLogger';


/**
 * @class WebpackDeploySshPlugin
 * @extends Object
 * A Webpack plugin that makes it easier to deploy bundles to remote machines,
 * and display OS-level notifications for both Webpack build and SSH actions events.
 */
export default class WebpackDeploySshPlugin {
  // Default options
  private hideStartingStats: boolean = false;
  private compileHandler: CompileHandler;
  private readonly pluginName: string;
  private startCompile: boolean;
  private remoteOutput: string;
  private displayNotifications: boolean;
  private options: any;
  private webpackInstance: typeof webpack;

  // constructor
  constructor(options: Options = {}) {
    this.options = {
      color: true,
      format: 'compact',
      name: 'Ev Apps Bundling: Starting ...',
      ...options,
    };
    if (!isPlainObject(options)) {
      throw new Error(`Webpack-Deploy-Ssh-Plugin only accepts an options object. See:
            https://github.com/ybarhouni/webpack-deploy-ssh-plugin#options-and-defaults-optional`);
    }
    this.pluginName = 'Webpack-Deploy-Ssh-Plugin';
    this.displayNotifications = true;
    options = Object.assign(this, options);
    //
    this.compileHandler = new CompileHandler(options);
    this.startCompile = true;
    this.remoteOutput = options.remoteOutput || '';
    this.webpackInstance = options.webpackInstance || webpack;
  }

  /**
   * hook
   * @param compiler
   * @param hookName
   * @param fn
   * @private
   */
  private hook(compiler: Compiler, hookName: any, fn: any) {
    (compiler.hooks as unknown as any)[hookName].tap(`${this.pluginName}:${hookName}`, fn);
  }

  /**
   * apply
   * @param compiler
   */
  public apply(compiler: webpack.Compiler): any {
    if (compiler.hooks && compiler.hooks.watchRun && compiler.hooks.done) {
      // for webpack >= 4
      if (!this.hideStartingStats) {
        compiler.hooks.watchRun.tapAsync(this.pluginName, (comp: webpack.Compiler, callback) => {
          this.compileHandler.onCompilationWatchRun(comp, callback);
        });
      }
      this.hook(compiler, 'done',
        (stats: webpack.Stats) => this.compileHandler.onCompilationDone(stats));
      this.hook(compiler, 'afterDone',
        (stats: webpack.Stats) => this.compileHandler.collectAssets(stats));
      this.hook(compiler, 'assetEmitted',
        (file: string, {source}: webpack.AssetEmittedInfo) => this.compileHandler.onAssetsEmitted(file, source, compiler));
    } else {
      // for webpack < 4
      this.compileHandler.displayNotSupportedWebpackVersion();
    }
    // Run the progressLogger
    const progressLogger =  new ProgressLogger(this.options);
    return progressLogger.apply(compiler);
  }

}

module.exports = WebpackDeploySshPlugin;
