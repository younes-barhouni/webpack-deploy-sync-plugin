import path from 'path';
import process from 'process';
import os from 'os';
import notifier from 'node-notifier';
import stripAnsi from 'strip-ansi';
import { exec, execFileSync } from 'child_process';
import { Notification } from 'node-notifier/notifiers/notificationcenter';
import { CompilationResult, Options, CompilationStatus } from '../types';
import webpack, {Compilation} from 'webpack';

const DEFAULT_ICON_PATH = path.resolve(__dirname, '../assets');

// https://github.com/mikaelbr/node-notifier/issues/154
// Specify appID to prevent SnoreToast shortcut installation.
// SnoreToast actually uses it as the string in the notification's
// title bar (different from title heading inside notification).
// This only has an effect in Windows.
// const snoreToastOptions = notifier.Notification === notifier.WindowsToaster && { appID: 'Vue UI' }


class Notifier {
  private appName: string | undefined = undefined;
  private buildSuccessful: boolean = false;
  private hasRun: boolean = false;
  // Default options
  private title: string = '';
  private logo?: string = path.join(DEFAULT_ICON_PATH, 'compile_success.png');
  private sound: string = 'Submarine';
  private readonly successSound: string;
  private readonly warningSound: string;
  private readonly failureSound: string;
  private readonly compilationSound: string;
  private suppressSuccess: boolean | 'always' | 'initial' = false;
  private suppressWarning: boolean = false;
  private activateTerminalOnError: boolean = false;
  private showDuration: boolean = false;

  private successIcon: string = path.join(DEFAULT_ICON_PATH, 'compile_success.png');
  private warningIcon: string = path.join(DEFAULT_ICON_PATH, 'compile_warning.png');
  private failureIcon: string = path.join(DEFAULT_ICON_PATH, 'compile_failure.png');
  private compileIcon: string = path.join(DEFAULT_ICON_PATH, 'compile_process.png');
  private sshSuccessIcon: string = path.join(DEFAULT_ICON_PATH, 'ssh_success.png');
  private sshFailureIcon: string = path.join(DEFAULT_ICON_PATH, 'ssh_failure.png');
  private sshActionIcon: string = path.join(DEFAULT_ICON_PATH, 'ssh_action.png');
  private deployEndIcon: string = path.join(DEFAULT_ICON_PATH, 'deploy_end.png');

  private onCompileStart?: Options['onCompileStart'];
  private onComplete?: Options['onComplete'];
  private onClick: Options['onClick'] = () => this.activateTerminalWindow;
  private onTimeout?: Options['onTimeout'];
  private formatSuccess?: Options['formatSuccess'];
  private messageFormatter?: Options['messageFormatter'];
  private notifyOptions?: Options['notifyOptions'];

  constructor(options: Options) {
    Object.assign(this, options);
    if (this.sound) {
      this.successSound = this.successSound ?? this.sound;
      this.warningSound = this.warningSound ?? this.sound;
      this.failureSound = this.failureSound ?? this.sound;
      this.compilationSound = this.compilationSound ?? this.sound;
    }
    this.registerSnoreToast();
    notifier.on('click', this.onClick!);
    if (this.onTimeout) {
      notifier.on('timeout', this.onTimeout);
    }
  }

  private activateTerminalWindow(): void {
    if (process.platform === 'darwin') {
      // TODO: is there a way to translate $TERM_PROGRAM into the application name
      // to make this more flexible?
      exec('TERM="$TERM_PROGRAM"; ' +
        '[[ "$TERM" == "Apple_Terminal" ]] && TERM="Terminal"; ' +
        '[[ "$TERM" == "vscode" ]] && TERM="Visual Studio Code"; ' +
        'osascript -e "tell application \\"$TERM\\" to activate"');
    } else if (process.platform === 'win32') {
      // TODO: Windows platform
    }
  }

  private registerSnoreToast(): void  {
    // ensure the SnoreToast appId is registered, which is needed for Windows Toast notifications
    // this is necessary in Windows 8 and above, (Windows 10 post build 1709), where all notifications must be generated
    // by a valid application.
    // see: https://github.com/KDE/snoretoast, https://github.com/RoccoC/webpack-build-notifier/issues/20

    if (process.platform === 'win32') {
      const versionParts = os.release().split('.');
      const winVer = +(`${versionParts[0]}.${versionParts[1]}`);

      if (winVer >= 6.2) {
        // Windows version >= 8
        //`snoretoast-${process.arch === 'x64' ? 'x64' : 'x86'}.exe`
        const snoreToast = path.join(
          require.resolve('node-notifier'),
          '../vendor/snoreToast',
          `snoretoast-${process.arch === 'x64' ? 'x64' : 'x86'}.exe`
        );
        try {
          execFileSync(
            snoreToast,
            [
              '-appID',
              'notification',
              '-install',
              'notification.lnk',
              'notification.exe',
              'notification',
            ]
          );
          this.appName = 'Webpack Deploy SSH';
        } catch (e) {
          console.error('An error occurred while attempting to install the SnoreToast AppID!', e);
        }
      }
    }
  }

  // formats the error/warning message
  private readonly formatMessage = (
    error: CompilationResult,
    filepath: string,
    status: CompilationStatus,
    errorCount: number
  ): string => {
    let message: string | undefined;
    if (this.messageFormatter) {
      message = this.messageFormatter(error, filepath, status, errorCount);
    } else {
      message = (error.message || error.details);
      if (message && error.module && error.module.resource) {
        message = `${filepath}${os.EOL}${message!.replace(error.module.resource, '')}`;
      }
    }
    if (message === undefined) {
      return 'Unknown';
    } else if (typeof message === 'string') {
      return message.slice(0, 256); // limit message length to 256 characters, fixes #20
    } else {
      throw `Invalid message type '${typeof message}'; messageFormatter must return a string.`;
    }
  };

  public readonly onCompilationDone = (results: webpack.Stats): void => {
    let notify: boolean = false;
    let title = `${this.title} - `;
    let msg = this.formatSuccess?.() ?? 'Build successful!';
    let icon = this.successIcon;
    let sound = this.successSound;
    let compilationStatus = CompilationStatus.SUCCESS;

    if (results.hasErrors()) {
      const error = this.getFirstWarningOrError(results.compilation, 'errors');
      const errorFilePath = error.module && error.module.resource ? error.module.resource : '';
      notify = true;
      compilationStatus = CompilationStatus.ERROR;
      title += 'Error';
      msg = this.formatMessage(
        error,
        errorFilePath,
        compilationStatus,
        this.getWarningOrErrorCount(results.compilation, 'errors')
      );
      icon = this.failureIcon;
      sound = this.failureSound;
      this.buildSuccessful = false;
    } else if (!this.suppressWarning && results.hasWarnings()) {
      const warning = this.getFirstWarningOrError(results.compilation, 'warnings');
      const warningFilePath = warning.module && warning.module.resource ? warning.module.resource : '';
      notify = true;
      compilationStatus = CompilationStatus.WARNING;
      title += 'Warning';
      msg = this.formatMessage(
        warning,
        warningFilePath,
        compilationStatus,
        this.getWarningOrErrorCount(results.compilation, 'warnings')
      );
      icon = this.warningIcon;
      sound = this.warningSound;
      this.buildSuccessful = false;
    } else {
      title += 'Success';
      if (this.showDuration) {
        msg += ` [${results.endTime - results.startTime} ms]`;
      }
      if (this.suppressSuccess === 'always' || (this.suppressSuccess === 'initial' && !this.hasRun)) {
        notify = false;
      } else if (this.suppressSuccess === false || !this.buildSuccessful) {
        notify = true; // previous build failed, let's show a notification even if success notifications are suppressed
      }
      this.buildSuccessful = true;
    }

    const notifyOptions =
      (typeof this.notifyOptions === 'function'
        ? this.notifyOptions(compilationStatus)
        : this.notifyOptions) ?? {};

    if (notify) {
      notifier.notify(
        Object.assign(notifyOptions, {
          title,
          sound,
          icon,
          appID: 'Notification',
          message: stripAnsi(msg),
          contentImage: this.logo,
          wait: !this.buildSuccessful
        })
      );

      if (this.onComplete) {
        this.onComplete(results.compilation, compilationStatus);
      }
    }

    if (this.activateTerminalOnError && !this.buildSuccessful) {
      this.activateTerminalWindow();
    }

    this.hasRun = true;
  };

  public readonly onCompilationWatchRun = (
    compiler: webpack.Compiler,
    callback: Function
  ): void => {
    notifier.notify({
      appID: 'Notification',
      title: `${this.title} - watching`,
      message: 'Compilation started...',
      contentImage: path.join(DEFAULT_ICON_PATH, 'compile_success.png'),
      icon: this.compileIcon,
      sound: this.compilationSound
    } as Notification);
    if (this.onCompileStart) {
      this.onCompileStart(compiler);
    }
    callback();
  };

  private readonly getFirstWarningOrError = (
    compilation: webpack.Compilation,
    type: 'warnings' | 'errors'
  ): any => {

    if (compilation.children && compilation.children.length) {
      for (let child of compilation.children) {
        const warningsOrErrors = child[type];
        if (warningsOrErrors && warningsOrErrors[0]) {
          return warningsOrErrors[0];
        }
      }
    }
    return compilation[type][0];
  }

  private readonly getWarningOrErrorCount = (
    compilation: webpack.Compilation,
    type: 'warnings' | 'errors',
  ): number => {
    if (compilation.children && compilation.children.length) {
      const count = compilation.children.reduce((previousCount: number, child: Compilation) => {
        let currentCount = previousCount;
        const warningsOrErrors = child[type];
        if (warningsOrErrors) {
          currentCount += warningsOrErrors.length;
        }
        return currentCount;
      }, 0);
      if (count > 0) {
        return count;
      }
    }
    return compilation[type].length;
  };

  public readonly warnIsNotSupported = (): void => {
    notifier.notify({
      appID: 'Notification',
      title: this.title,
      message: 'Webpack < 4 is not supported !',
      contentImage: this.logo,
      icon: this.warningIcon,
      sound: this.warningSound
    } as Notification);
  }

  public readonly notifyWithActions = (message, yesCallback, noCallback): void => {
    notifier.notify({
      appID: 'Notification',
      title: `${this.title} - Action needed !`,
      message,
      contentImage: this.logo,
      icon: this.sshActionIcon,
      actions: ['Yes', 'No']
    } as Notification);
    // Built-in actions:
    notifier.once('timeout', () => {
      noCallback();
      notifier.off('timeout', () => {});
    });
    // Buttons actions (lower-case):
    notifier.once('yes', () => {
      yesCallback();
      notifier.off('yes', () => {});
    });
    notifier.once('no', () => {
      noCallback();
      notifier.off('no', () => {});
    });

  }

  public readonly deployRemoteEnd = (): void => {
    notifier.notify({
      appID: 'Notification',
      title: this.title,
      message: 'Deploy to remote succeed !',
      contentImage: this.logo,
      icon: this.deployEndIcon,
      sound: this.successSound
    } as Notification);
  }

  public readonly sshConnectionSuccess = (): void => {
    notifier.notify({
      appID: 'Notification',
      title: this.title,
      message: 'SSH connection succeed !',
      contentImage: this.logo,
      icon: this.sshSuccessIcon,
      sound: this.successSound
    } as Notification);
  }

  public readonly sshConnectionFail = (): void => {
    notifier.notify({
      appID: 'Notification',
      title: this.title,
      message: 'SSH connection failed !',
      contentImage: this.logo,
      icon: this.sshFailureIcon,
      sound: this.warningSound
    } as Notification);
  }
}

export default Notifier;
