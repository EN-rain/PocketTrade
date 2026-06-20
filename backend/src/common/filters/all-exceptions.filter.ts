import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: string = 'Internal Server Error';
    let message: string | string[] = 'Unexpected error';
    const production = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      error = this.defaultErrorName(statusCode);
      const exResponse = exception.getResponse();
      if (production && statusCode >= 500) {
        this.logger.error(exception.stack);
        message = 'Unexpected error';
      } else {
        if (typeof exResponse === 'string') {
          message = exResponse;
        } else if (typeof exResponse === 'object' && exResponse !== null) {
          const r = exResponse as Record<string, unknown>;
          message = (r.message as string | string[]) ?? exception.message;
          if (typeof r.error === 'string') {
            error = r.error;
          }
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma error ${exception.code}`, exception.stack);
      if (exception.code === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = production ? 'Resource already exists' : `Unique constraint violation on field(s): ${((exception.meta?.target as string[]) ?? []).join(', ')}`;
      } else if (exception.code === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = 'Resource not found';
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Database Error';
        message = production ? 'Invalid database request' : exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack);
      message = production ? 'Unexpected error' : exception.message;
    }

    const body = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private defaultErrorName(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return map[status] ?? 'Error';
  }
}
