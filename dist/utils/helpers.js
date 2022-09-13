"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUUID = exports.log = exports.formatSize = exports.colorize = exports.colorList = exports.isPlainObject = void 0;
// Copied from https://github.com/sindresorhus/is-plain-obj/blob/97480673cf12145b32ec2ee924980d66572e8a86/index.js
function isPlainObject(value) {
    if (Object.prototype.toString.call(value) !== '[object Object]') {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.getPrototypeOf({});
}
exports.isPlainObject = isPlainObject;
exports.colorList = {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37
};
function colorize(color, output) {
    return ['\x1b[', color, 'm', output, '\x1b[0m'].join('');
}
exports.colorize = colorize;
function formatSize(size) {
    if (Number.isNaN(size) === true) {
        return 'unknown size';
    }
    if (size <= 0) {
        return '0 bytes';
    }
    const abbreviations = ['bytes', 'KiB', 'MiB', 'GiB'];
    const index = Math.floor(Math.log(size) / Math.log(1024));
    return `${+(size / Math.pow(1024, index)).toPrecision(3)} ${abbreviations[index]}`;
}
exports.formatSize = formatSize;
/**
 *
 * @param color
 * @param message
 * @private
 */
function log(color, message) {
    process.stdout.write(colorize(color, message));
    process.stdout.write('\n');
}
exports.log = log;
function createUUID() {
    const uuidPattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    let dt = new Date().getTime();
    return uuidPattern.replace(/[xy]/g, (c) => {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
exports.createUUID = createUUID;
//# sourceMappingURL=helpers.js.map