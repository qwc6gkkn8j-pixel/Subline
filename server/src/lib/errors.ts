export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const BadRequest = (msg = 'Bad request', code?: string) => new HttpError(400, msg, code);
export const Unauthorized = (msg = 'Unauthorized', code?: string) => new HttpError(401, msg, code);
export const Forbidden = (msg = 'Forbidden', code?: string) => new HttpError(403, msg, code);
export const NotFound = (msg = 'Not found', code?: string) => new HttpError(404, msg, code);
export const Conflict = (msg = 'Conflict', code?: string) => new HttpError(409, msg, code);
