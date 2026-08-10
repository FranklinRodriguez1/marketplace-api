-- The GiST index on the PostGIS geography column. Prisma does not generate an index over an
-- Unsupported type, so it is added by hand here. ST_DWithin uses it to discard everything
-- outside the search radius before computing distances — the difference between a scan and a seek.
CREATE INDEX "listing_location_gist" ON "Listing" USING GIST ("location");
