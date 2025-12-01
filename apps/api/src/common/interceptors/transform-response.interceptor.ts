import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginationMeta } from '../types';

interface DataWithMeta<T> {
  data: T;
  meta?: PaginationMeta;
}

function isPaginatedResponse<T>(value: unknown): value is DataWithMeta<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T | DataWithMeta<T>) => {
        // Handle null/undefined responses
        if (data === null || data === undefined) {
          return {
            success: true,
          };
        }

        // Handle paginated responses
        if (isPaginatedResponse<T>(data)) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
          };
        }

        // Handle regular responses
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
