/* eslint-disable @typescript-eslint/no-explicit-any */
import Client, {ConnectOptions} from 'ssh2-sftp-client';
import PromisePool from 'es6-promise-pool';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import {colorize, colorList, log} from '../utils/helpers';
import { SFTPWrapper } from 'ssh2';
// import * as fs from 'node:fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('node:events').EventEmitter.defaultMaxListeners = 30; // prevent events memory leak message

/**
 * Deploy Class
 */
class Deploy {

  private readonly sftp: Client;
  private sshConfig: ConnectOptions & {remote: string, tmpPath: string, localOutput: string};

  /**
   * constructor
   * @param sshConfig
   */
  public constructor(sshConfig: ConnectOptions & {remote: string, tmpPath: string, localOutput: string}, success, fail) {
    this.sshConfig = sshConfig;
    try {
      this.sftp = this.connect(success, fail);
    } catch (error) {
      process.stdout.write(colorize(colorList.red, error.message));
      process.stdout.write('\n');
    }
  }

  /**
   * connect
   * @private
   */
  private connect(success, fail) {
    const client = new Client();
    client.connect(this.sshConfig)
      .then(() => {
        process.stdout.write(`Connection to remote \u001B[36m${this.sshConfig.host}\u001B[0m successfully established.`);
        process.stdout.write('\n');
        success();
        // this.doSync(this.sshConfig, client);

      })
      .catch((error: Error): void => {
        log(colorList.red, error.message);
        fail()
      });
    //
    if (client) {
      client.on('upload', (info: any) => {
        console.log('Listener: Uploaded', `\u001B[32m${info.source}\u001B[0m`);
      })
      client.on('end', () => {
        log(colorList.yellow, 'Deploy complete.');
      });
    }
    return client;
  }

  /**
   * doSync
   * @param sshConfig
   * @param client
   * @private
   */
  // private doSync(sshConfig, client) {
  //   // const localManifestData: string = fs.readFileSync(`${sshConfig.localOutput}/manifest.json`) as unknown as string;
  //   // const localManifest = JSON.parse(localManifestData);
  //   // console.log(localManifest.uuid);
  //   client.get(`${sshConfig.remote}/manifest.json`, `${sshConfig.tmpPath}/manifest.json`)
  //     .then((file: string ) => {
  //       // const remoteManifestData: string = fs.readFileSync(file) as unknown as string;
  //       // const remoteManifest = JSON.parse(remoteManifestData);
  //       // console.log(remoteManifest.uuid);
  //     });
  // }

  /**
   * onOkUploadAllDist
   * @param localOutput
   * @param remoteOutput
   * @private
   */
  private async onOkUploadAllDist(localOutput, remoteOutput): Promise<void> {
    const client = this.sftp;
    // console.log(localOutput, remoteOutput)
    process.stdout.write(colorize(colorList.cyan,'Please Wait! Sync with remote dist started...'));
    try {
      client.rmdir(remoteOutput, true).then(() => {
        process.stdout.write(colorize(colorList.white,'remote output cleaning started...'));
        return client.mkdir(remoteOutput);
      }).then(async () => {
        process.stdout.write(colorize(colorList.white,'remote output cleaning finished.'));
        // upload generated bundles in outputPath to remote destination
        await client.uploadDir(localOutput, remoteOutput);
        process.stdout.write(colorize(colorList.cyan,'Sync with remote dist finished'));
      }).finally(async () => {
        await client.end();
      })
      .catch((error: any) => {
        console.log(error)
        log(colorList.red,' Something went wrong!.');
      });
    } catch (error) {
      console.log(error)
      log(colorList.red,' Something went wrong!.');
    }
  }

  /**
   * onCancelUploadDist
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
    const message = 'Do you want to sync project with remote dist?';
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
      return new Promise((resolve) => {
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
          }}, () => {
            resolve(bundle);
          });
      });
    }

    /**
     * uploadBundlesGenerator
     * @param conn
     * @param bundles
     */
    function *uploadBundlesGenerator(conn, bundles) {
      for(const bundle of bundles) {
        yield uploadBundle(conn, bundle);
      }
    }

    try {
      const conn = new Client();
      conn.connect(this.sshConfig)
        .then((sftp: SFTPWrapper) => {
          success();
          const promiseIterator = uploadBundlesGenerator(sftp, modifiedBundles)
          const pool = new PromisePool(promiseIterator as unknown as () => void | PromiseLike<unknown>, 10);
          pool.start().then(() => {
            sftp.end();
            log(colorList.yellow,' Deploy complete.');
            end();
          });
        }).catch(() => {
          log(colorList.red,' Something went wrong!.');
          failure()
        });
    } finally {
      start()
    }
  }

}

export default Deploy;
