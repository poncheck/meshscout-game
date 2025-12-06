-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable PostGIS for geographic calculations (optional but useful)
CREATE EXTENSION IF NOT EXISTS postgis;

-- After Prisma creates tables, we'll convert them to hypertables
-- This will be done in a migration script after initial schema creation

-- Create indexes for performance
-- (These will supplement Prisma's indexes)

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371; -- Earth radius in km
  dLat DOUBLE PRECISION;
  dLon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);

  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
