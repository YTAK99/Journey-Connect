CREATE TABLE post_place (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES journey_post(id) ON DELETE CASCADE,
    region_id BIGINT NOT NULL REFERENCES region(id),
    place_name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    CONSTRAINT post_place_sort_order_non_negative CHECK (sort_order >= 0),
    CONSTRAINT post_place_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT post_place_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_post_place_post_order ON post_place(post_id, sort_order);
CREATE INDEX idx_post_place_region ON post_place(region_id);

INSERT INTO post_place (post_id, region_id, place_name, latitude, longitude, content, sort_order)
SELECT p.id,
       p.region_id,
       p.region_name,
       ST_Y(r.center),
       ST_X(r.center),
       p.content,
       0
FROM journey_post p
JOIN region r ON r.id = p.region_id;

ALTER TABLE post_image ADD COLUMN place_id BIGINT REFERENCES post_place(id) ON DELETE CASCADE;

UPDATE post_image image
SET place_id = place.id
FROM post_place place
WHERE place.post_id = image.post_id
  AND place.sort_order = 0;

CREATE INDEX idx_post_image_place_order ON post_image(place_id, sort_order);
