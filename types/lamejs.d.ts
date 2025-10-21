declare module "lamejs" {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
}

declare module "lamejs/lame.min.js" {
  const lamejs: any;
  export default lamejs;
}

declare module "lamejs/src/js/index.js" {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
  export const MPEGMode: any;
  export const Lame: any;
  const defaultExport: {
    Mp3Encoder: typeof Mp3Encoder;
    MPEGMode: any;
    Lame: any;
  };
  export default defaultExport;
}
