"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_table_1 = __importDefault(require("cli-table"));
const notifier_1 = __importDefault(require("../notifier/notifier"));
const helpers_1 = require("../utils/helpers");
const deploy_1 = __importDefault(require("../deployer/deploy"));
/**
 * CompileHandler
 */
class CompileHandler {
    /**
     *
     * @param options
     */
    constructor(options) {
        this.displayNotifications = true;
        this.options = options;
        this.notifierHandle = new notifier_1.default(options);
        this.startCompile = true;
        this.modifiedBundles = [];
        this.pluginName = options.pluginName || 'pluginName';
        this.deploy = new deploy_1.default(Object.assign(Object.assign({}, options.sshConfig), { localOutput: this.options.localOutput, tmpPath: this.options.tmpPath, remote: this.options.remoteOutput }), () => {
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
    collectAssets(stats) {
        const localOutput = stats.compilation.compiler.options.output.path;
        if (this.afterStartCompile) {
            const context = stats.compilation.compiler.context; // ex: C:\xampp8\htdocs\evsaml
            stats.compilation.emittedAssets.forEach((asset) => {
                this.modifiedBundles.push(asset.replace(/\//g, '\\'));
            });
            if (stats.compilation.compiler.modifiedFiles) {
                stats.compilation.compiler.modifiedFiles.forEach((file) => {
                    const modified = file.split(context).pop();
                    this.tableModifieds.push([modified]);
                });
            }
            this.deploy.unitUpload(this.modifiedBundles, this.options.remoteOutput, localOutput, () => {
                this.modifiedBundles = [];
                console.log(this.tableModifieds.toString());
                console.log(this.tableBundles.toString());
                this.tableModifieds = this.initModifiedsTable();
                this.tableBundles = this.initBundlesTable();
            }, () => this.notifierHandle.sshConnectionSuccess(), () => this.notifierHandle.sshConnectionFail(), () => this.notifierHandle.deployRemoteEnd());
        }
        else {
            let notificationUpload;
            if (this.options.displayNotifications) {
                notificationUpload = this.notifierHandle.notifyWithActions;
            }
            this.deploy.bulkUpload(localOutput, this.options.remoteOutput, notificationUpload);
            this.afterStartCompile = true;
        }
    }
    /**
     * onCompilationDone
     * @param stats
     */
    onCompilationDone(stats) {
        this.notifierHandle.onCompilationDone(stats);
    }
    /**
     * onCompilationWatchRun
     * @param compiler
     * @param callback
     */
    onCompilationWatchRun(compiler, callback) {
        this.notifierHandle.onCompilationWatchRun(compiler, callback);
    }
    /**
     *
     * @param file
     * @param source
     */
    onAssetsEmitted(file, source) {
        if (this.afterStartCompile) {
            const asset = file.replace(/\//g, '\\');
            const size = (0, helpers_1.formatSize)(source.size());
            this.tableBundles.push([asset, size]);
        }
    }
    displayNotSupportedWebpackVersion() {
        this.notifierHandle.warnIsNotSupported();
    }
    /**
     * initBundlesTable
     * @private
     */
    initBundlesTable() {
        return new cli_table_1.default({ head: ['Bundle', 'Size'], colWidths: [45, 15] });
    }
    /**
     * initModifiedsTable
     * @private
     */
    initModifiedsTable() {
        return new cli_table_1.default({ head: ['Modified Files'], colWidths: [60] });
    }
}
exports.default = CompileHandler;
//# sourceMappingURL=compileHandler.js.map