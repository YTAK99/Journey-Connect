CREATE TABLE IF NOT EXISTS crew_route_place (
    id BIGSERIAL PRIMARY KEY,
    crew_id BIGINT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
    region_id BIGINT NOT NULL REFERENCES region(id),
    place_name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    CONSTRAINT crew_route_place_sort_order_non_negative CHECK (sort_order >= 0),
    CONSTRAINT crew_route_place_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT crew_route_place_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_crew_route_place_crew_order
    ON crew_route_place (crew_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_crew_route_place_region
    ON crew_route_place (region_id);

CREATE TABLE IF NOT EXISTS crew_route_image (
    id BIGSERIAL PRIMARY KEY,
    place_id BIGINT NOT NULL REFERENCES crew_route_place(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    sort_order INTEGER NOT NULL,
    alt_text VARCHAR(200),
    CONSTRAINT crew_route_image_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_crew_route_image_place_order
    ON crew_route_image (place_id, sort_order);
