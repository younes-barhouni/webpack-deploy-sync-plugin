"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = __importDefault(require("node:process"));
const node_os_1 = __importDefault(require("node:os"));
const node_notifier_1 = __importDefault(require("node-notifier"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const node_child_process_1 = require("node:child_process");
const types_1 = require("../types");
// https://github.com/mikaelbr/node-notifier/issues/154
// Specify appID to prevent SnoreToast shortcut installation.
// SnoreToast actually uses it as the string in the notification's
// title bar (different from title heading inside notification).
// This only has an effect in Windows.
// const snoreToastOptions = notifier.Notification === notifier.WindowsToaster && { appID: 'Vue UI' }
const DEFAULT_ICON_PATH = node_path_1.default.resolve(__dirname, '../assets');
class Notifier {
    constructor(options) {
        var _a, _b, _c, _d;
        this.buildSuccessful = false;
        this.hasRun = false;
        // Default options
        this.title = '';
        this.sound = 'Submarine';
        this.suppressSuccess = false;
        this.suppressWarning = false;
        this.activateTerminalOnError = false;
        this.showDuration = false;
        this.logo = node_path_1.default.join(DEFAULT_ICON_PATH, 'webpack.png');
        this.successIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'compile_success.png');
        this.warningIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'compile_warning.png');
        this.failureIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'compile_failure.png');
        this.compileIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'compile_process.png');
        this.sshSuccessIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'ssh_success.png');
        this.sshFailureIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'ssh_failure.png');
        this.sshActionIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'ssh_action.png');
        this.deployEndIcon = node_path_1.default.join(DEFAULT_ICON_PATH, 'deploy_end.png');
        this.onClick = () => this.activateTerminalWindow;
        /**
         *
         * @param message
         * @param yesCallback
         * @param noCallback
         */
        this.notifyWithActions = (message, yesCallback, noCallback) => {
            node_notifier_1.default.notify({
                appID: 'Notification',
                title: `${this.title} - Action needed !`,
                message,
                contentImage: this.logo,
                icon: this.sshActionIcon,
                actions: ['Yes', 'No']
            });
            // Built-in actions:
            node_notifier_1.default.once('timeout', () => {
                noCallback();
                node_notifier_1.default.off('timeout', () => undefined);
            });
            // Buttons actions (lower-case):
            node_notifier_1.default.once('yes', () => {
                yesCallback();
                node_notifier_1.default.off('yes', () => undefined);
            });
            node_notifier_1.default.once('no', () => {
                noCallback();
                node_notifier_1.default.off('no', () => undefined);
            });
        };
        Object.assign(this, options);
        if (this.sound) {
            this.successSound = (_a = this.successSound) !== null && _a !== void 0 ? _a : this.sound;
            this.warningSound = (_b = this.warningSound) !== null && _b !== void 0 ? _b : this.sound;
            this.failureSound = (_c = this.failureSound) !== null && _c !== void 0 ? _c : this.sound;
            this.compilationSound = (_d = this.compilationSound) !== null && _d !== void 0 ? _d : this.sound;
        }
        this.registerSnoreToast();
        node_notifier_1.default.on('click', this.onClick);
    }
    activateTerminalWindow() {
        if (node_process_1.default.platform === 'darwin') {
            // TODO: is there a way to translate $TERM_PROGRAM into the application name
            // to make this more flexible?
            (0, node_child_process_1.exec)('TERM="$TERM_PROGRAM"; ' +
                '[[ "$TERM" == "Apple_Terminal" ]] && TERM="Terminal"; ' +
                '[[ "$TERM" == "vscode" ]] && TERM="Visual Studio Code"; ' +
                'osascript -e "tell application \\"$TERM\\" to activate"');
        }
        else if (node_process_1.default.platform === 'win32') {
            // TODO: Windows platform
        }
    }
    /**
     *
     * @private
     */
    registerSnoreToast() {
        // ensure the SnoreToast appId is registered, which is needed for Windows Toast notifications
        // this is necessary in Windows 8 and above, (Windows 10 post build 1709), where all notifications must be generated
        // by a valid application.
        // see: https://github.com/KDE/snoretoast, https://github.com/RoccoC/webpack-build-notifier/issues/20
        if (node_process_1.default.platform === 'win32') {
            const versionParts = node_os_1.default.release().split('.');
            const winVersion = +(`${versionParts[0]}.${versionParts[1]}`);
            if (winVersion >= 6.2) {
                // Windows version >= 8
                const snoreToast = node_path_1.default.join(require.resolve('node-notifier'), '../vendor/snoreToast', `snoretoast-${node_process_1.default.arch === 'x64' ? 'x64' : 'x86'}.exe`);
                try {
                    (0, node_child_process_1.execFileSync)(snoreToast, [
                        '-appID',
                        'notification',
                        '-install',
                        'notification.lnk',
                        'notification.exe',
                        'notification',
                    ]);
                }
                catch (error) {
                    console.error('An error occurred while attempting to install the SnoreToast AppID!', error);
                }
            }
        }
    }
    // formats the error/warning message
    formatMessage(error, filepath) {
        let message;
        message = (error.message || error.details);
        if (message && error.module && error.module.resource) {
            message = `${filepath}${node_os_1.default.EOL}${message.replace(error.module.resource, '')}`;
        }
        if (message === undefined) {
            return 'Unknown';
        }
        else if (typeof message === 'string') {
            return message.slice(0, 256); // limit message length to 256 characters, fixes #20
        }
    }
    /**
     *
     * @param compilation
     * @param type
     * @private
     */
    getFirstWarningOrError(compilation, type) {
        if (compilation.children && compilation.children.length > 0) {
            for (const child of compilation.children) {
                const warningsOrErrors = child[type];
                if (warningsOrErrors && warningsOrErrors[0]) {
                    return warningsOrErrors[0];
                }
            }
        }
        return compilation[type][0];
    }
    /**
     * onCompilationDone
     * @param results
     */
    onCompilationDone(results) {
        let notify = false;
        let title = `${this.title} - `;
        let message = 'Build successful!';
        let icon = this.successIcon;
        let sound = this.successSound;
        let compilationStatus = types_1.CompilationStatus.SUCCESS;
        if (results.hasErrors()) {
            const error = this.getFirstWarningOrError(results.compilation, 'errors');
            const errorFilePath = error.module && error.module.resource ? error.module.resource : '';
            notify = true;
            compilationStatus = types_1.CompilationStatus.ERROR;
            title += 'Error';
            message = this.formatMessage(error, errorFilePath);
            icon = this.failureIcon;
            sound = this.failureSound;
            this.buildSuccessful = false;
        }
        else if (!this.suppressWarning && results.hasWarnings()) {
            const warning = this.getFirstWarningOrError(results.compilation, 'warnings');
            const warningFilePath = warning.module && warning.module.resource ? warning.module.resource : '';
            notify = true;
            compilationStatus = types_1.CompilationStatus.WARNING;
            title += 'Warning';
            message = this.formatMessage(warning, warningFilePath);
            icon = this.warningIcon;
            sound = this.warningSound;
            this.buildSuccessful = false;
        }
        else {
            title += 'Success';
            if (this.showDuration) {
                message += ` [${results.endTime - results.startTime} ms]`;
            }
            if (this.suppressSuccess === false || !this.buildSuccessful) {
                notify = true; // previous build failed, let's show a notification even if success notifications are suppressed
            }
            this.buildSuccessful = true;
        }
        if (notify) {
            node_notifier_1.default.notify({
                appID: 'Notification',
                title,
                icon,
                message: (0, strip_ansi_1.default)(message),
                contentImage: this.logo,
                sound,
                wait: !this.buildSuccessful
            });
            if (this.onComplete) {
                this.onComplete(results.compilation, compilationStatus);
            }
        }
        if (this.activateTerminalOnError && !this.buildSuccessful) {
            this.activateTerminalWindow();
        }
        this.hasRun = true;
    }
    /**
     *
     * @param compiler
     * @param callback
     */
    onCompilationWatchRun(compiler, callback) {
        node_notifier_1.default.notify({
            appID: 'Notification',
            title: `${this.title} - watching`,
            message: 'Compilation started...',
            contentImage: node_path_1.default.join(DEFAULT_ICON_PATH, 'compile_success.png'),
            icon: this.compileIcon,
            sound: this.compilationSound
        });
        if (this.onCompileStart) {
            this.onCompileStart(compiler);
        }
        callback();
    }
    /**
     *
     */
    warnIsNotSupported() {
        node_notifier_1.default.notify({
            appID: 'Notification',
            title: this.title,
            message: 'Webpack < 4 is not supported !',
            contentImage: this.logo,
            icon: this.warningIcon,
            sound: this.warningSound
        });
    }
    /**
     *
     */
    deployRemoteEnd() {
        node_notifier_1.default.notify({
            appID: 'Notification',
            title: this.title,
            message: 'Deploy to remote succeed !',
            contentImage: this.logo,
            icon: this.deployEndIcon,
            sound: this.successSound
        });
    }
    /**
     *
     */
    sshConnectionSuccess() {
        node_notifier_1.default.notify({
            appID: 'Notification',
            title: this.title,
            message: 'SSH connection succeed !',
            contentImage: this.logo,
            icon: this.sshSuccessIcon,
            sound: this.successSound
        });
    }
    /**
     *
     */
    sshConnectionFail() {
        node_notifier_1.default.notify({
            appID: 'Notification',
            title: this.title,
            message: 'SSH connection failed !',
            contentImage: this.logo,
            icon: this.sshFailureIcon,
            sound: this.warningSound
        });
    }
}
exports.default = Notifier;
//# sourceMappingURL=notifier.js.map