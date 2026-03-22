Review the provided repository context and/or schema for Supabase correctness.

Focus on:
- schema mismatch
- incorrect foreign keys
- dangerous nullable assumptions
- missing indexes
- missing unique constraints
- poor auditability
- weak RLS policies
- incorrect ownership checks
- moderation/reporting gaps
- unsafe insert/update/delete exposure

Output:
- severity
- file
- issue
- rationale
- fix
- SQL/test recommendation