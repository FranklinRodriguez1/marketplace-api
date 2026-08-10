export interface ReviewRecord {
  id: string;
  bookingId: string;
  listingId: string;
  authorId: string;
  rating: number;
  body: string;
  createdAt: Date;
}
