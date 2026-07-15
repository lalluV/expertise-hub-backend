export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ok = <T>(data: T, message = "Success") => ({
  success: true,
  message,
  data,
});
