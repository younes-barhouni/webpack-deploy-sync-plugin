"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressLogger = void 0;
const chalk_1 = __importDefault(require("chalk"));
const figures_1 = __importDefault(require("figures"));
const log_update_1 = __importDefault(require("log-update"));
const path = __importStar(require("node:path"));
/**
 * Progress logger class
 */
class ProgressLogger {
    /**
     * Constructor
     *
     * @param options Options
     */
    constructor(options) {
        this.options = options;
    }
    /**
     * Apply
     *
     * @param compiler Compiler
     */
    apply(compiler) {
        // Variables for the process, reset after each run
        let startTime = new Date();
        let previousStep = 0;
        // const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        // bar.start(100, 0);
        /**
         * Use the webpack-internal progress plugin as the base of the logger
         */
        const absoluteProjectPath = `${path.resolve('.').toString()}`;
        return new this.options.webpackInstance.ProgressPlugin((progress, message, moduleProgress, activeModules, moduleName) => {
            // Initial log
            const logLines = [];
            // Reset process variables for this run
            if (previousStep === 0) {
                (0, log_update_1.default)(this.options.name);
                startTime = new Date();
                // bar.start(100, 0);
            }
            // STEP 0: HEADER
            logLines.push(chalk_1.default.white('Webpack: Starting ...\n'));
            // STEP 1: COMPILATION
            if (progress >= 0 && progress < 0.1) {
                // Skip if we jumped back a step, else update the step counter
                if (previousStep > 1) {
                    return;
                }
                previousStep = 1;
                logLines.push(chalk_1.default.white(`  ${figures_1.default.pointer} Compile modules`));
            }
            else if (progress >= 0.1) {
                logLines.push(chalk_1.default.green(`  ${figures_1.default.tick} Compile modules`));
            }
            // STEP 2: BUILDING
            if (progress >= 0.1 && progress <= 0.7) {
                // Skip if we jumped back a step, else update the step counter
                if (previousStep > 2) {
                    return;
                }
                previousStep = 2;
                // Log progress line (with sub-progress indicator)
                const subProgress = Math.round(((progress - 0.1) * 10000) / 60);
                logLines.push(chalk_1.default.white(`  ${figures_1.default.pointer} Build modules (${subProgress}%)`));
                // Log additional information (if possible)
                if (moduleName !== undefined) {
                    let betterModuleName = moduleName;
                    // Only show the file that is actually being processed (and remove all details about used loaders)
                    if (betterModuleName.includes('!')) {
                        const splitModuleName = betterModuleName.split('!');
                        betterModuleName = splitModuleName[splitModuleName.length - 1];
                    }
                    // Transform absolute paths into relative ones (to shorten the so so incredible long path)
                    if (betterModuleName.includes(absoluteProjectPath)) {
                        betterModuleName = betterModuleName
                            .split(`${absoluteProjectPath}`)[1] // Transform absolute path to relative one
                            .slice(1); // Remove leading path slash
                    }
                    // Improve the path presentation further by enforcing style consistency and removing unnecessary details
                    betterModuleName = betterModuleName.replace(/\\/g, '/').replace('./', '').replace('multi ', '');
                    // Add extra details about whether the currently processed module is an internal or external one
                    if (betterModuleName.startsWith('node_modules')) {
                        betterModuleName = `${betterModuleName} ~ external`;
                    }
                    if (betterModuleName.startsWith('src')) {
                        betterModuleName = `${betterModuleName} ~ internal`;
                    }
                    const [betterModulesDone, betterAllModules] = moduleProgress.split('/');
                    const moduleDetails = `${betterModulesDone} of ${betterAllModules} :: ${betterModuleName}`;
                    logLines.push(chalk_1.default.grey(`    ${figures_1.default.arrowRight} ${moduleDetails}`));
                }
                // bar.update(subProgress);
            }
            else if (progress > 0.7) {
                logLines.push(chalk_1.default.green(`  ${figures_1.default.tick} Build modules`));
            }
            // STEP 3: OPTIMIZATION
            if (progress > 0.7 && progress < 0.95) {
                // Skip if we jumped back a step, else update the step counter
                if (previousStep > 3) {
                    return;
                }
                previousStep = 3;
                // Log progress line (with sub-progress indicator)
                const subProgress = Math.round(((progress - 0.71) * 10000) / 23);
                logLines.push(chalk_1.default.white(`  ${figures_1.default.pointer} Optimize modules (${subProgress}%)`));
                const formattedMessage = `${message[0].toUpperCase()}${message.slice(1)}`;
                const formattedMessageExtra = progress === 0.91 ? ' -- may take a while' : ''; // Add some extra info (calming devs down)
                logLines.push(chalk_1.default.grey(`    ${figures_1.default.arrowRight} ${formattedMessage}${formattedMessageExtra} ...`));
                // bar.update(subProgress);
            }
            else if (progress >= 0.95) {
                logLines.push(chalk_1.default.green(`  ${figures_1.default.tick} Optimize modules`));
            }
            // STEP 4: EMIT
            if (progress >= 0.95 && progress < 1) {
                // Skip if we jumped back a step, else update the step counter
                if (previousStep > 4) {
                    return;
                }
                previousStep = 4;
                logLines.push(chalk_1.default.white(`  ${figures_1.default.pointer} Emit files`));
                // const subProgress = Math.round(((progress - 0.96) * 10_000) / 23);
                // bar.update(subProgress);
            }
            else if (progress === 1) {
                logLines.push(chalk_1.default.green(`  ${figures_1.default.tick} Emit files`));
            }
            // STEP 5: FOOTER
            if (progress === 1) {
                // Calculate process time
                previousStep = 0;
                const finishTime = new Date();
                const processTime = ((finishTime.getTime() - startTime.getTime()) / 1000).toFixed(3);
                logLines.push(chalk_1.default.white(`\nFinished after ${processTime} seconds.\n`));
                // bar.stop();
            }
            // Finally, let's bring those logs to da screen
            (0, log_update_1.default)(logLines.join('\n'));
            if (progress === 1) {
                log_update_1.default.done();
            }
        }).apply(compiler);
    }
}
exports.ProgressLogger = ProgressLogger;
//# sourceMappingURL=ProgressLogger.js.map