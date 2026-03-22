Review the provided repository context and/or diff for offline-first correctness.

Focus on:
- optimistic update failure modes
- retry loops
- duplicated mutations
- lack of idempotency
- queue corruption
- stale cache invalidation
- conflict resolution gaps
- reconnect behavior
- partial-failure handling
- app restart persistence gaps

Output:
- severity
- file
- issue
- rationale
- fix
- test