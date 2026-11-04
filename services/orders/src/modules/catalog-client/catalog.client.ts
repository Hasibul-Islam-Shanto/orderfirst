import CircuitBreaker from 'opossum';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../errors/app-error.js';

export interface CatalogMenuItem {
  id: string;
  name: string;
  price: string | number;
  isAvailable: boolean;
}

async function fetchCatalogBatchRaw(ids: string[]): Promise<CatalogMenuItem[]> {
  const url = `${env.CATALOG_SERVICE_URL}/internal/menu-items/batch`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.INTERNAL_SECRET ? { 'X-Internal-Secret': env.INTERNAL_SECRET } : {}),
    },
    body: JSON.stringify({ ids }),
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Catalog service responded with status ${response.status}`);
  }

  return response.json() as Promise<CatalogMenuItem[]>;
}

export const catalogCircuitBreaker = new CircuitBreaker(fetchCatalogBatchRaw, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

catalogCircuitBreaker.on('open', () => {
  logger.warn('Catalog circuit breaker OPENED');
});

catalogCircuitBreaker.on('halfOpen', () => {
  logger.info('Catalog circuit breaker HALF-OPEN');
});

catalogCircuitBreaker.on('close', () => {
  logger.info('Catalog circuit breaker CLOSED');
});

export async function fetchCatalogBatchWithRetry(
  ids: string[],
  maxRetries = 2,
): Promise<CatalogMenuItem[]> {
  let attempt = 0;
  while (true) {
    try {
      return (await catalogCircuitBreaker.fire(ids)) as CatalogMenuItem[];
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        logger.error({ error, ids }, 'Failed to fetch catalog batch after retries');
        throw new AppError(
          503,
          'Catalog service is currently unavailable. Please try again.',
          'CATALOG_UNAVAILABLE',
        );
      }
      const backoffMs = Math.pow(2, attempt - 1) * 200;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

