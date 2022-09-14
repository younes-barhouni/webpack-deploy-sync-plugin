"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const es6_promise_pool_1 = __importDefault(require("es6-promise-pool"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const inquirer_1 = __importDefault(require("inquirer"));
const helpers_1 = require("../utils/helpers");
// import * as fs from 'node:fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('events').EventEmitter.defaultMaxListeners = 30; // prevent events memory leak message
/**
 * Deploy Class
 */
class Deploy {
    /**
     * constructor
     * @param sshConfig
     */
    constructor(sshConfig, success, fail) {
        this.sshConfig = sshConfig;
        try {
            this.sftp = this.connect(success, fail);
        }
        catch (error) {
            process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.red, error.message));
            process.stdout.write('\n');
        }
    }
    /**
     * connect
     * @private
     */
    connect(success, fail) {
        const client = new ssh2_sftp_client_1.default();
        client.connect(this.sshConfig)
            .then(() => {
            process.stdout.write(`Connection to remote \x1b[36m${this.sshConfig.host}\x1b[0m successfully established.`);
            process.stdout.write('\n');
            success();
            // this.doSync(this.sshConfig, client);
        })
            .catch((err) => {
            (0, helpers_1.log)(helpers_1.colorList.red, err.message);
            fail();
        });
        //
        if (client) {
            client.on('upload', (info) => {
                console.log('Listener: Uploaded ', `\x1b[32m${info.source}\x1b[0m`);
            });
            client.on('end', () => {
                (0, helpers_1.log)(helpers_1.colorList.yellow, 'Deploy complete.');
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
    onOkUploadAllDist(localOutput, remoteOutput) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.sftp;
            // console.log(localOutput, remoteOutput)
            process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.cyan, 'Please Wait! Sync with remote dist started...'));
            try {
                client.rmdir(remoteOutput, true).then(() => {
                    process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.white, 'remote output cleaning started...'));
                    return client.mkdir(remoteOutput);
                }).then(() => __awaiter(this, void 0, void 0, function* () {
                    process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.white, 'remote output cleaning finished.'));
                    // upload generated bundles in outputPath to remote destination
                    yield client.uploadDir(localOutput, remoteOutput);
                    process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.cyan, 'Sync with remote dist finished'));
                })).finally(() => __awaiter(this, void 0, void 0, function* () {
                    yield client.end();
                }))
                    .catch((err) => {
                    console.log(err);
                    (0, helpers_1.log)(helpers_1.colorList.red, ' Something went wrong!.');
                });
            }
            catch (e) {
                //console.log(e)
                (0, helpers_1.log)(helpers_1.colorList.red, ' Something went wrong!.');
            }
        });
    }
    /**
     * onCancelUploadDist
     * @private
     */
    onCancelUploadDist() {
        process.stdout.clearLine(0);
        process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.cyan, 'Sync with remote aborted ')); //cyan
        process.stdout.write('\n');
    }
    /**
     * bulkUpload
     * @param localOutput
     * @param remoteOutput
     * @param notificationPrompt
     */
    bulkUpload(localOutput, remoteOutput, notificationPrompt) {
        const message = 'Do you want to sync project with remote dist?';
        if (notificationPrompt) {
            notificationPrompt(message, () => {
                // you pressed YES
                void this.onOkUploadAllDist(localOutput, remoteOutput);
            }, () => {
                // you pressed NO
                this.onCancelUploadDist();
            });
        }
        else {
            inquirer_1.default
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
                }
                else {
                    this.onCancelUploadDist();
                }
            }).finally(() => {
                console.log('*************** Finally *****************');
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
    unitUpload(modifiedBundles, remoteOutput, localOutput, start, success, failure, end) {
        //
        (0, helpers_1.log)(helpers_1.colorList.cyan, 'Wait please! upload modified files to remote dist started...');
        // Function used to upload files in promise pool
        function uploadBundle(sftp, bundle) {
            return new Promise((resolve) => {
                const bar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                // start the progress bar with a total value of 200 and start value of 0
                bar.start(100, 0);
                return sftp.fastPut(`${localOutput}/${bundle}`, `${remoteOutput}/${bundle}`, { concurrency: 1, chunkSize: 128 * 1024, step: function (transferred, chunk, total) {
                        // uploaded 1 chunk
                        // with concurrency = 32 on a 20MB file this gets called about 6 times and then the process just hangs forever
                        // create a new progress bar instance and use shades_classic theme
                        const percent = Math.round(transferred / total * 100);
                        bar.update(percent);
                        if (transferred === total) {
                            // stop the progress bar
                            bar.stop();
                            process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.white, 'Upload ')); //cyan
                            process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.green, bundle)); //cyan
                            process.stdout.write((0, helpers_1.colorize)(helpers_1.colorList.white, ' with success')); //cyan
                            process.stdout.write('\n');
                        }
                    } }, () => {
                    resolve(bundle);
                });
            });
        }
        /**
         * uploadBundlesGenerator
         * @param conn
         * @param bundles
         */
        function* uploadBundlesGenerator(conn, bundles) {
            for (const bundle of bundles) {
                yield uploadBundle(conn, bundle);
            }
        }
        try {
            const conn = new ssh2_sftp_client_1.default();
            conn.connect(this.sshConfig)
                .then((sftp) => {
                success();
                const promiseIterator = uploadBundlesGenerator(sftp, modifiedBundles);
                const pool = new es6_promise_pool_1.default(promiseIterator, 10);
                pool.start().then(() => {
                    sftp.end();
                    (0, helpers_1.log)(helpers_1.colorList.yellow, ' Deploy complete.');
                    end();
                });
            }).catch(() => {
                (0, helpers_1.log)(helpers_1.colorList.red, ' Something went wrong!.');
                failure();
            });
        }
        finally {
            start();
        }
    }
}
exports.default = Deploy;
//# sourceMappingURL=deploy.js.map