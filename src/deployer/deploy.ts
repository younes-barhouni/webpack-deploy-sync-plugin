import Client, {ConnectOptions} from 'ssh2-sftp-client';
import PromisePool from 'es6-promise-pool';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import {colorize, colorList, log} from '../utils/helpers';
import { SFTPWrapper } from 'ssh2';
require('events').EventEmitter.defaultMaxListeners = 25; // prevent events memory leak message

/**
 * Deploy Class
 */
class Deploy {
  private sftp: Client;
  private sshConfig: ConnectOptions;

  /**
   *
   * @param sshConfig
   */
  public constructor(sshConfig: ConnectOptions) {
    this.sshConfig = sshConfig;
  }

  /**
   *
   * @private
   */
  private connect(success, fail) {
    const client = new Client();
    client.connect(this.sshConfig)
      .then((sftp) => {
        process.stdout.write(`Connection to remote \x1b[36m${this.sshConfig.host}\x1b[0m successfully established.`);
        process.stdout.write('\n');
        success()
      }).catch((err: any): void => {
        log(colorList.red, err.message);
        fail()
      });
    //
    if (client) {
      client.on('upload', (info: any) => {
        console.log('Listener: Uploaded ', `\x1b[32m${info.source}\x1b[0m`);
      })
      client.on('end', () => {
        log(colorList.yellow, 'Deploy complete.');
      });
    }
    return client;
  }

  /**
   * handlePrepareRemote
   */
  public async handlePrepareRemote(success, fail): Promise<void> {
    try {
      this.sftp = this.connect(success, fail);
    } catch (e) {
      process.stdout.write(colorize(colorList.red, e.message));//cyan
      process.stdout.write('\n');
    }
  }

  /**
   *
   * @param localOutput
   * @param remoteOutput
   * @private
   */
  private async onOkUploadAllDist(localOutput, remoteOutput): Promise<void> {
    process.stdout.write(colorize(colorList.cyan,'Please Wait! Sync with remote dist started...'));//cyan
    try {
      this.sftp.rmdir(remoteOutput, true).then(() => {
        process.stdout.write(colorize(colorList.white,'remote output cleaning started...'));
        return this.sftp.mkdir(remoteOutput);
      }).then(async () => {
        process.stdout.write(colorize(colorList.white,'remote output cleaning finished.'));
        // upload generated bundles in outputPath to remote destination
        await this.sftp.uploadDir(localOutput, remoteOutput);
        process.stdout.write(colorize(colorList.cyan,'Sync with remote dist finished'));
      }).catch((err: any) => {
        // console.error('err.message => ', err.message);
        log(colorList.red,' Something went wrong!.');
      });
    } finally {
      console.log('*************** Finally *****************')
      await this.sftp.end();
    }
  }

  /**
   *
   * @private
   */
  private onCancelUploadDist(): void {
    process.stdout.clearLine(0);
    process.stdout.write(colorize(colorList.cyan,'Sync with remote aborted '));//cyan
    process.stdout.write('\n');
  }

  /**
   * bulkUpload
   * @param localOutput
   * @param remoteOutput
   * @param notificationPrompt
   */
  public bulkUpload(localOutput, remoteOutput, notificationPrompt?: (message, yesCallback, noCallback) => void): void {
    const message: string = 'Do you want to sync project with remote dist?';
    if (notificationPrompt) {
      notificationPrompt(message, () => {
        // you pressed YES
        void this.onOkUploadAllDist(localOutput, remoteOutput);
      }, () => {
        // you pressed NO
        this.onCancelUploadDist();
      });
    } else {
      inquirer
        .prompt([
          {
            name: 'promptUpload',
            message
          },
        ])
        .then((answers) => {
          const answer = answers.promptUpload.toLowerCase();
          const possibleAnswers = ['y', 'yes', 'oui', 'o'];
          if (possibleAnswers.includes(answer)) {
            void this.onOkUploadAllDist(localOutput, remoteOutput);
          } else {
            this.onCancelUploadDist();
          }
        }).finally(() => {
          console.log('*************** Finally *****************')
      });
    }
  }

  /**
   * unitUpload
   * @param modifiedBundles
   * @param remoteOutput
   * @param localOutput
   * @param start
   * @param success
   * @param failure
   * @param end
   */
  public unitUpload(modifiedBundles: Array<string>, remoteOutput, localOutput, start, success, failure, end): void {
    //
    log(colorList.cyan, 'Wait please! upload modified files to remote dist started...');
    // Function used to upload files in promise pool
    function uploadBundle(sftp, bundle) {
      return new Promise((resolve, reject) => {
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        // start the progress bar with a total value of 200 and start value of 0
        bar.start(100, 0);
        return sftp.fastPut(`${localOutput}\\${bundle}`, `${remoteOutput}\\${bundle}`, {concurrency: 1, chunkSize: 128*1024, step: function(transferred, chunk, total) {
            // uploaded 1 chunk
            // with concurrency = 32 on a 20MB file this gets called about 6 times and then the process just hangs forever
            // create a new progress bar instance and use shades_classic theme
            const percent = Math.round(transferred / total * 100);
            bar.update(percent);
            if (transferred === total) {
              // stop the progress bar
              bar.stop();
              process.stdout.write(colorize(colorList.white,'Upload '));//cyan
              process.stdout.write(colorize(colorList.green, bundle));//cyan
              process.stdout.write(colorize(colorList.white,' with success'));//cyan
              process.stdout.write('\n');
            }
          }}, (error) => {
            resolve(bundle);
          });
      });
    }

    /**
     *
     * @param conn
     * @param bundles
     */
    function *uploadBundlesGenerator(conn, bundles) {
      for(const bundle of bundles) {
        yield uploadBundle(conn, bundle);
      }
    }

    try {
      let conn = new Client();
      conn.connect(this.sshConfig)
        .then((sftp: SFTPWrapper) => {
          success();
          const promiseIterator = uploadBundlesGenerator(sftp, modifiedBundles)
          let pool = new PromisePool(promiseIterator as unknown as () => void | PromiseLike<unknown>, 10);
          pool.start().then(() => {
            sftp.end();
            log(colorList.yellow,' Deploy complete.');
            end();
          });
        }).catch((error) => {
          log(colorList.red,' Something went wrong!.');
          failure()
        });
    } finally {
      start()
    }
  }

}

export default Deploy;
