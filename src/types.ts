import NotificationCenter from 'node-notifier/notifiers/notificationcenter';
import { NodeNotifier } from 'node-notifier';
import webpack from 'webpack';

/**
 * Enum representing valid compilation result statuses.
 */
export enum CompilationStatus {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export type CompilationResult = {
  details?: string;
  message?: string;
  module?: {
    rawRequest?: string;
    resource?: string;
  };
};

export type Options = {
  /**
   * The notification title prefix. Defaults to `Webpack Build`.
   */
  title?: string;
  /**
   * The absolute path to the project logo to be displayed as a content image in the notification. Optional.
   */
  logo?: string;
  /**
   * A function which is invoked when compilation starts. Optional. The function is passed one parameter:
   * 1. {webpack.compiler.Compiler} compiler - The webpack Compiler instance.
   * Note that `suppressCompileStart` must be `false`.
   */
  onCompileStart?: (compilation: webpack.Compiler) => void;
  /**
   * A function which is invoked when compilation completes. Optional. The function is passed two parameters:
   * 1. {webpack.compilation.Compilation} compilation - The webpack Compilation instance.
   * 2. {CompilationStatus} status - one of 'success', 'warning', or 'error'
   */
  onComplete?: (compilation: webpack.Compilation, status: CompilationStatus) => void;
  /**
   * True to show the duration of a successful compilation, otherwise false (default).
   */
  showDuration?: boolean;
  /**
   * Defines when success notifications are shown. Can be one of the following values:
   *
   *  * `false`     - Show success notification for each successful compilation (default).
   *  * `true`      - Only show success notification for initial successful compilation and after failed compilations.
   *  * `"always"`  - Never show the success notifications.
   *  * `"initial"` - Same as true, but suppresses the initial success notification.
   */
  suppressSuccess?: boolean | 'always' | 'initial';
  /**
   * True to suppress the warning notifications, otherwise false (default).
   */
  suppressWarning?: boolean
  /**
   * True to suppress the compilation started notifications (default), otherwise false.
   */
  suppressCompileStart?: boolean
  /**
   * True to activate (focus) the terminal window when a compilation error occurs.
   * Note that this only works on Mac OSX. Defaults to `false`.
   */
  activateTerminalOnError?: boolean
  /**
   * A function called when clicking on a warning or error notification. By default, it activates the Terminal application.
   * The function is passed two parameters:
   *
   *  1. {NotificationCenter} notifierObject - The notifier object instance.
   *  2. {NotificationCenter.Notification} options - The notifier object options.
   */
  onClick?: (notifier: NodeNotifier, options: NotificationCenter.Notification) => void;

  pluginName?: string;
  sshConfig?: Record<string, string|number>;

  remoteOutput?: string;
  displayNotifications?: boolean;
  webpackInstance?: typeof webpack,
  getCompilerHooks?: any;
  tmpPath?: string;
  localOutput?: string;
};

/**
 * Progress Logger Options
 */
export interface IProgressLoggerOptions {
  color: boolean;
  name: string;
  webpackInstance: any;
}
