Original prompt: "of course!!! lets have this new clean code a project in the public folder of sbqc! lets dig, if im right, this was all made so the project folder can contain individual repos and have them updated when needed... something like that. of course, this old sync solution can be optimized / replaced with todays better"

## 2026-07-18

- Confirmed the legacy design cloned or pulled four Git repositories directly inside `public/Projects` on every non-test server startup.
- Replaced that mutable runtime behavior with `projects.config.json`, exact commit pins, sparse checkout support, isolated builds, provenance metadata, subpath rewriting, and atomic per-project activation.
- Migrated mqttTest, DrawTogether, PhotoBox, and Tides to the publisher; added GraphysX at pinned commit `36eac3d5a023e7a21f7b319e6e335d7ffca7d1d1`.
- Added read-only `/api/projects` discovery. GraphysX advertises its existing browser-local agent bridge, while remote mutation remains disabled pending an authenticated, session-scoped browser relay.
- Real five-project publication passes locally. GraphysX sparse checkout includes only `web-prototype` and the ten directly imported car source assets; TypeScript/Vite build passes and generated root asset URLs are rewritten for `/Projects/GraphysX/`.

- SBQC-path browser verification is clean. The generic web-game client loaded `/Projects/GraphysX/`, exercised the Agent World Studio, reported a 16-entity `graphysx.agent-world-state/v2`, and produced no console/page error file. Home and Agent World screenshots were visually inspected.
- The external Playwright stdio adapter connected to the SBQC-hosted URL, loaded the Physics Sketchbook through the public bridge, then queried the same persistent world and found its `lab-agent` observer entity.
- `/api/projects/graphysx` returns pinned provenance, deployed build/rewrite facts, launch URL, bridge schemas, transports, and an explicit `remoteMutation: false` safety boundary.
- The real release activator swapped all five managed projects, removed staging/backups, and preserved the unmanaged `Nature of Code` directory.
- Final release gate passes after activation: all five managed HTTP entry points and `/api/projects` return 200; the direct (non-npm-wrapper) GraphysX publisher build passes; the Agent World browser state remains 16 entities with zero error files; and the production workflow parses as valid YAML with every third-party action pinned to a verified release commit.

TODO: commit and publish the branch, deploy through the production workflow, and verify the live URLs. A future authenticated session relay can connect an external agent to a particular human-visible browser world; the current external adapter controls its own persistent browser session.
