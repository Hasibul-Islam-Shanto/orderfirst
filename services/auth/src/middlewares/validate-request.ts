import type { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';

export function validateRequest<Schema extends z.ZodType>(
  schema: Schema,
  controller: (
    request: Request,
    response: Response,
    input: z.output<Schema>,
  ) => Promise<unknown> | unknown,
): RequestHandler {
  return async (request, response) => {
    const input = schema.parse({
      body: request.body,
      params: request.params,
      query: request.query,
    });
    await controller(request, response, input);
  };
}

