import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const statusCode = getErrorStatusCode(error);
    const message = getSafeErrorMessage(statusCode);

    logger.error(
      {
        requestId: request.id,
        statusCode,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      },
      'Request failed',
    );
    response.status(statusCode).json({ message });
  };
}

function getErrorStatusCode(error: unknown): 400 | 413 | 500 {
  if (!isErrorWithStatus(error)) return 500;
  if (error.status === 413 || error.statusCode === 413) return 413;
  if (error.type === 'entity.parse.failed' || error.status === 400 || error.statusCode === 400) {
    return 400;
  }

  return 500;
}

function getSafeErrorMessage(statusCode: 400 | 413 | 500): string {
  if (statusCode === 400) return 'Bad request';
  if (statusCode === 413) return 'Payload too large';
  return 'Internal server error';
}

function isErrorWithStatus(error: unknown): error is {
  status?: number;
  statusCode?: number;
  type?: string;
} {
  return typeof error === 'object' && error !== null;
}
