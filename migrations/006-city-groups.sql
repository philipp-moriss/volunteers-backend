-- 006-city-groups: city_groups table and cities.group_id
-- With synchronize: true TypeORM creates these automatically; use this file if you run migrations manually.

CREATE TABLE IF NOT EXISTS city_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES city_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cities_group_id ON cities(group_id);
