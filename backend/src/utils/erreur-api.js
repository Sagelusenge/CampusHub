export class ErreurApi extends Error {
  constructor(codeHttp, message, details = undefined) {
    super(message);
    this.name = 'ErreurApi';
    this.codeHttp = codeHttp;
    this.details = details;
  }
}
