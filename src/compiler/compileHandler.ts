import webpack from 'webpack';
import Table from 'cli-table';
import {Options} from '../types';
import Notifier from '../notifier/notifier';
import {formatSize} from '../utils/helpers';
import Deploy from '../deployer/deploy';

/**
 * CompileHandler
 */
export default class CompileHandler {
  /** notifier */
  private notifierHandle: Notifier;
  /** notifier */
  private options: Options;
  private startCompile: boolean;
  private pluginName: string;
  private deploy: Deploy;
  private afterStartCompile: boolean;
  private modifiedBundles: Array<string>;
  private displayNotifications = true;
  private tableBundles: Table;
  private tableModifieds: Table;

  /**
   *
   * @param options
   */
  constructor(options: Options) {
    this.options = options;
    this.notifierHandle = new Notifier(options);
    this.startCompile = true;
    this.modifiedBundles = [];
    this.pluginName = options.pluginName || 'pluginName';
    this.deploy = new Deploy({...options.sshConfig,
      localOutput: this.options.localOutput,
      tmpPath: this.options.tmpPath,
      remote: this.options.remoteOutput}, () => {
      this.notifierHandle.sshConnectionSuccess();
    }, () => {
      this.notifierHandle.sshConnectionFail();
    });
    this.afterStartCompile = false;
    this.tableBundles = this.initBundlesTable();
    this.tableModifieds = this.initModifiedsTable();
  }

  /**
   * collectAssets
   * @param stats
   */
  public collectAssets(stats: webpack.Stats): void {
    const localOutput = stats.compilation.compiler.options.output.path;
    if (this.afterStartCompile) {
      const context = stats.compilation.compiler.context; // ex: C:\xampp8\htdocs\evsaml
      for (const asset of stats.compilation.emittedAssets) {
        this.modifiedBundles.push(asset.replace(/\//g, '\\'));
      }
      if (stats.compilation.compiler.modifiedFiles) {
        for (const file of stats.compilation.compiler.modifiedFiles) {
          const modified = file.split(context).pop();
          this.tableModifieds.push([modified]);
        }
      }
      this.deploy.unitUpload(this.modifiedBundles, this.options.remoteOutput, localOutput, () => {
        this.modifiedBundles = []
        console.log(this.tableModifieds.toString());
        console.log(this.tableBundles.toString());
        this.tableModifieds = this.initModifiedsTable();
        this.tableBundles = this.initBundlesTable();
      }, () => this.notifierHandle.sshConnectionSuccess(),
        () => this.notifierHandle.sshConnectionFail(),
        () => this.notifierHandle.deployRemoteEnd());
    } else {
      let notificationUpload;
      if (this.options.displayNotifications) {
        notificationUpload = this.notifierHandle.notifyWithActions
      }
      this.deploy.bulkUpload(localOutput, this.options.remoteOutput, notificationUpload);
      this.afterStartCompile = true;
    }
  }

  /**
   * onCompilationDone
   * @param stats
   */
  public onCompilationDone(stats: webpack.Stats): void {
    this.notifierHandle.onCompilationDone(stats);
  }

  /**
   * onCompilationWatchRun
   * @param compiler
   * @param callback
   */
  public onCompilationWatchRun (compiler: webpack.Compiler, callback: () => void): void {
    this.notifierHandle.onCompilationWatchRun(compiler, callback);
  }

  /**
   *
   * @param file
   * @param source
   */
  public onAssetsEmitted(file, source): void {
    if (this.afterStartCompile) {
      const asset = file.replace(/\//g, '\\');
      const size = formatSize(source.size());
      this.tableBundles.push([asset, size]);
    }
  }

  public displayNotSupportedWebpackVersion(): void {
    this.notifierHandle.warnIsNotSupported();
  }

  /**
   * initBundlesTable
   * @private
   */
  private initBundlesTable(): Table {
    return new Table({head: ['Bundle', 'Size'], colWidths: [45, 15]});
  }

  /**
   * initModifiedsTable
   * @private
   */
  private initModifiedsTable(): Table {
    return new Table({head: ['Modified Files'], colWidths: [60]});
  }
}
