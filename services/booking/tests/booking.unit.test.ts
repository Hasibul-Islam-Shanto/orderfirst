import { describe, it, expect } from 'vitest';
import { createReservationRequest } from '../src/modules/reservations/reservation.validation.js';
import { reservationConflictWhere } from '../src/modules/reservations/reservation.service.js';
import { createTableRequest } from '../src/modules/tables/table.validation.js';
import { reservationTransitions } from '../src/modules/reservations/reservation.constants.js';

const resourceId = '10000000-0000-4000-8000-000000000001';

describe('Booking service validation and conflict logic', () => {
  it('requires a future timestamp with a timezone and a valid party size', () => {
    const body = {
      restaurantTableId: resourceId,
      reservationDate: new Date(Date.now() + 86400000).toISOString(),
      guestCount: 2,
    };
    expect(createReservationRequest.safeParse({ body }).success).toBe(true);

    expect(
      createReservationRequest.safeParse({
        body: { ...body, reservationDate: '2020-01-01T18:00:00Z' },
      }).success,
    ).toBe(false);

    expect(
      createReservationRequest.safeParse({ body: { ...body, guestCount: 9 } })
        .success,
    ).toBe(false);

    expect(
      createReservationRequest.safeParse({
        body: { ...body, reservationDate: '2030-01-01T18:00:00' },
      }).success,
    ).toBe(false);
  });

  it('uses open boundaries for adjacent 90-minute reservations', () => {
    const date = new Date('2030-01-01T18:00:00Z');
    expect(reservationConflictWhere(date)).toEqual({
      status: { in: ['PENDING', 'CONFIRMED'] },
      reservationDate: {
        gt: new Date('2030-01-01T16:30:00Z'),
        lt: new Date('2030-01-01T19:30:00Z'),
      },
    });
  });

  it('validates table capacity and table number constraints', () => {
    expect(
      createTableRequest.safeParse({
        body: { tableNumber: 12, capacity: 4 },
      }).success,
    ).toBe(true);

    expect(
      createTableRequest.safeParse({
        body: { tableNumber: 0, capacity: 4 },
      }).success,
    ).toBe(false);

    expect(
      createTableRequest.safeParse({
        body: { tableNumber: 1, capacity: 10 },
      }).success,
    ).toBe(false);
  });

  it('enforces valid status transitions for reservations', () => {
    expect(reservationTransitions.PENDING).toContain('CONFIRMED');
    expect(reservationTransitions.PENDING).toContain('CANCELLED');
    expect(reservationTransitions.CONFIRMED).toContain('COMPLETED');
    expect(reservationTransitions.CONFIRMED).toContain('CANCELLED');
    expect(reservationTransitions.COMPLETED).toHaveLength(0);
    expect(reservationTransitions.CANCELLED).toHaveLength(0);
  });
});

