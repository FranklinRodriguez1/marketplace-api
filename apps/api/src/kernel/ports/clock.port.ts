// Inject non-determinism through a port: application tests become exact instead of tolerant,
// and `canReviewBooking(actor, booking, clock.now())` stays a pure call.
export const CLOCK = Symbol('CLOCK');

export interface ClockPort {
  now(): Date;
}
