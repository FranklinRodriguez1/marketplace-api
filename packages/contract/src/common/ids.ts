/**
 * Public identifiers are opaque strings (UUID v4/v7 on the wire). Kept as named
 * aliases so signatures read as intentions (`UserId`) rather than bare `string`.
 */
export type UserId = string;
export type ListingId = string;
export type BookingId = string;
export type ReviewId = string;
export type CategoryId = string;
export type ReportId = string;
