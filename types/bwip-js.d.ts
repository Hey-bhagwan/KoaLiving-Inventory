declare module 'bwip-js' {
  interface BwipOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: string;
    textsize?: number;
    backgroundcolor?: string;
    paddingwidth?: number;
    paddingheight?: number;
    rotate?: string;
    [key: string]: unknown;
  }

  function toCanvas(
    canvas: HTMLCanvasElement | string,
    options: BwipOptions
  ): HTMLCanvasElement;

  function toBuffer(
    options: BwipOptions,
    callback: (err: Error | undefined, png: Buffer) => void
  ): void;

  export { toCanvas, toBuffer };
  export default { toCanvas, toBuffer };
}
