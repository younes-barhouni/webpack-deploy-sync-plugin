// Copied from https://github.com/sindresorhus/is-plain-obj/blob/97480673cf12145b32ec2ee924980d66572e8a86/index.js
export function isPlainObject(value: any): boolean {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.getPrototypeOf({});
}

export const colorList = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37
};

export function colorize(color: number, output: string): string {
  return ['\x1b[', color, 'm', output, '\x1b[0m'].join('');
}

export function formatSize(size: number): string {
  if (Number.isNaN(size) === true) {
    return 'unknown size';
  }

  if (size <= 0) {
    return '0 bytes';
  }

  const abbreviations = ['bytes', 'KiB', 'MiB', 'GiB'];
  const index = Math.floor(Math.log(size) / Math.log(1024));

  return `${+(size / Math.pow(1024, index)).toPrecision(3)} ${
    abbreviations[index]
  }`;
}

/**
 *
 * @param color
 * @param message
 * @private
 */
export function log(color, message) {
  process.stdout.write(colorize(color, message));
  process.stdout.write('\n');
}

export function createUUID(){
  const uuidPattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  let dt = new Date().getTime();
  return uuidPattern.replace(/[xy]/g, (c) => {
    const r = (dt + Math.random()*16)%16 | 0;
    dt = Math.floor(dt/16);
    return (c=='x' ? r :(r&0x3|0x8)).toString(16);
  });
}
