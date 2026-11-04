import type { Response } from 'express';

export function sendSuccess(
  response: Response,
  data: unknown,
  message: string,
  status = 200,
) {
  return response.status(status).json({ success: true, message, data });
}

export function sendList(
  response: Response,
  result: { data: unknown[]; total: number },
  page: number,
  limit: number,
  message: string,
) {
  return response.json({
    success: true,
    message,
    data: result.data,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

