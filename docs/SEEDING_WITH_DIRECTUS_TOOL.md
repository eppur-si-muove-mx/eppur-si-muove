# Seeding Directus with the Directus Tool (No External Scripts)

This repository now supports seeding sample data directly into Directus using the Directus tool (no Python scripts needed).

What this does:
- Populates the content model implemented in Directus (planets, discoveries, training_datasets, training_runs, predictions)
- Uses the Directus API directly; data is created inside your running Directus instance

Notes:
- Creating planet_flags requires selecting a user (M2O to directus_users). Because reading core system collections is restricted, we recommend a tiny manual Flow in Directus that sets `user` to the current user (`$accountability.user`). See the Flow recipe below.

## Prerequisites

- Start the stack (Directus, API, DB, Redis):

```bash
make up
# or
make test-all
```

- Access Directus at: http://localhost:8055

## What gets seeded

- planets: a subset of rows mapped from `data/data_set_final.csv` (ids like `1000.01`, `1001.01`, ...)
- discoveries: a few entries pointing to the created planets with sample location/orientation
- training_datasets: one entry labeled “Initial Dataset (CSV sample)”
- training_runs: one completed run referencing the dataset with sample metrics
- predictions: a few predictions associated with planets
- planet_flags: see manual Flow below (requires selecting current user)

## Manual Flow (optional): Create Planet Flags for Current User

If you want to create `planet_flags` using the current authenticated user, create a Directus Flow:

1) Create a Flow
- Name: "[Seed] Create Flag for Current User"
- Trigger: Manual
- Options:
  - collections: ["planet_flags"] or ["planets"]
  - location: collection
  - requireSelection: false
  - fields:
    - planet (collection-item-dropdown → planets)
    - orbit (boolean)
    - alien (boolean)
    - heart (boolean)

2) Add an operation (item-create):
- key: create_flag
- type: item-create
- options:
  - collection: planet_flags
  - permissions: $trigger
  - emitEvents: true
  - payload:
    {
      "planet": "{{ $trigger.body.planet }}",
      "user": "{{ $accountability.user }}",
      "orbit": "{{ $trigger.body.orbit }}",
      "alien": "{{ $trigger.body.alien }}",
      "heart": "{{ $trigger.body.heart }}",
      "created_at": "{{ $trigger.timestamp }}",
      "pair_key": "{{ $trigger.body.planet }}:{{ $accountability.user }}"
    }

This allows creating flags without needing to read `directus_users` directly.

## Verifying the Data

Open these collections in the Directus Admin:
- Planets: http://localhost:8055/admin/content/planets
- Discoveries: http://localhost:8055/admin/content/discoveries
- Training Datasets: http://localhost:8055/admin/content/training_datasets
- Training Runs: http://localhost:8055/admin/content/training_runs
- Predictions: http://localhost:8055/admin/content/predictions
- Planet Flags (after manual flow): http://localhost:8055/admin/content/planet_flags

## Alternative: Python Seeder (Legacy)

You can still use the existing Python script:

```bash
make seed-directus
```

That will map `data/data_set_final.csv`, create synthetic discoveries and flags, and call the API for batch predictions. This remains useful for bulk or automated seeding, while the Directus tool approach keeps everything within Directus.