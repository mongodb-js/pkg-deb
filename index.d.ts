interface Options {
  version: string;
  name: string;
  dest: string;
  src: string;
  input: string;
  arch: string;
}
declare function doPackage(opts: Options): Promise<void>;
export = doPackage;
