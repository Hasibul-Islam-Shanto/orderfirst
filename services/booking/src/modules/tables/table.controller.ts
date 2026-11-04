import type { Request, Response } from 'express';
import type { z } from 'zod';
import type * as validation from './table.validation.js';
import * as service from './table.service.js';
import { sendSuccess, sendList } from '../../utils/response.js';

export async function getTables(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.tableListRequest>,
) {
  return sendList(
    response,
    await service.getTables(input.query),
    input.query.page,
    input.query.limit,
    'Tables retrieved successfully',
  );
}

export async function createTable(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.createTableRequest>,
) {
  return sendSuccess(
    response,
    await service.createTable(input.body),
    'Table created successfully',
    201,
  );
}

export async function updateTable(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.updateTableRequest>,
) {
  return sendSuccess(
    response,
    await service.updateTable(input.params.restaurantTableId, input.body),
    'Table updated successfully',
  );
}

export async function deleteTable(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.tableRequest>,
) {
  return sendSuccess(
    response,
    await service.deleteTable(input.params.restaurantTableId),
    'Table deleted successfully',
  );
}

export async function updateTableAvailability(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.tableAvailabilityRequest>,
) {
  return sendSuccess(
    response,
    await service.updateTableAvailability(
      input.params.restaurantTableId,
      input.body.isAvailable,
    ),
    'Table availability updated successfully',
  );
}

