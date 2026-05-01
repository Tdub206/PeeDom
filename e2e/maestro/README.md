# StallPass Maestro Device Flows

These flows are the Phase 5 device-level acceptance inventory for the StallPass restroom-intelligence work. They are intentionally stored as plain Maestro YAML so they can run locally or in Maestro Cloud once a signed debug build is installed on a simulator/emulator.

Run examples:

```bash
maestro test e2e/maestro/permission-denied-map.yaml
maestro test e2e/maestro/map-route-city-pack-smoke.yaml
maestro test e2e/maestro/offline-notification-emergency-smoke.yaml
```

Coverage targets:

- Location permission denial and map fallback surface.
- Map rendering smoke with location granted.
- City-pack modal entry and offline-pack state visibility.
- Route destination search entry.
- Notification/deep-link route handling smoke.
- Emergency-mode entry without premium gating.

The flows use `appId: com.stallpass.app`, matching `app.config.ts`.
