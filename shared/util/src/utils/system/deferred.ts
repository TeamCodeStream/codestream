// Credit: https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-the-promise-constructor-scope
export class Deferred<T> {
  private _resolve: ((value: PromiseLike<T> | T) => void) | undefined;
  private _reject: ((reason?: any) => void) | undefined;
  private resolved = false;
  private rejected = false;

  constructor(
    private _promise = new Promise<T>((resolve, reject) => {
      this._reject = reject;
      this._resolve = resolve;
    })
  ) {}

  get promise(): Promise<T> {
    return this._promise;
  }

  resolve(value: T) {
    if (this.resolved || this.rejected) {
      return;
    }
    this._resolve?.(value);
    this.resolved = true;
  }

  reject(error: unknown) {
    if (this.rejected || this.resolved) {
      return;
    }
    this._reject?.(error);
    this.rejected = true;
  }
}
