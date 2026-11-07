# Evidence-led debugging upgrade

**Approved scope:** Strengthen existing investigation, bug-fix routing, verification repair and build-test-repairer guidance using installed Superpowers 7.0.0. No new CLI, role, state schema or repair-loop runtime behavior.

**Architecture:** One packaged debugging guide under `pegatus-investigate` is shared by the investigation skill, start routing, verifier and repairer role. Preserve instructed context retrieval, actual stack conventions, current authorization, configured repairLimit, existing Result distinctions and final-state evidence. Retain reference hashes and the exact MIT license without changing pinned source locks or vendored code.

## Tasks

- [x] Baseline comparison and failing guide/resource-closure checks.
- [x] Add reproduce/trace/compare/hypothesis/repair/verify guidance, safe diagnostic boundaries and explicit reassessment stops. Integrate existing skills/role and invocation documentation.
- [x] Evaluate symptom/upstream cause, multi-component boundaries, intermittency/environment, pollution, repeated repairs, urgency, assessment-only and instrumentation scenarios. Run focused catalog/host/repair-loop checks, lint and package dry-run.

## Key boundaries

Investigate-only remains read-only on product code; existing fix authorization is preserved. Reproduction may be a credible source-based causal proof when runtime prerequisites are unavailable, with limits disclosed. Temporary instrumentation and experiments require appropriate existing authorization and cannot expose secrets or overwrite unrelated work. The diagnosis callback must remain read-only; the runtime detects changed observed code state and blocks continuation, rather than preventing edits. Repair limits and unchanged-failure stops remain authoritative; repeated failure suggests reassessment, not proof of an architectural defect or permission for a redesign. Preserve actual failed/blocked/NOT RUN outcomes.

## Evidence

- New debugging resource/host-packet tests failed 0/2 before implementation and then passed. They cover shared guide selection across investigation/start/verification/repairer, configured repairer tier, exact license SHA-256 and resource bytes for all host/scope packets.
- Final focused catalog/adapter/debugging/brainstorm/review/feedback/workflow/ECC and existing verification-loop checks passed 53/53. Lint passed with the existing Vercel notice warning. Whitespace check passed with `cr-at-eol`; the exact copied license has a scoped `-text` attribute.
- Read-only reviewer evaluated eight scenario groups and identified an incorrect runtime API name and wording that overstated mutation prevention. Both were corrected to `runVerification` and detection/blocking of continuation, and the scoped recheck confirmed resolution. No other material finding. These are instruction-level checks, not native-host trials.
- Package dry-run passed and includes the shared guide, reference, license and repairer. No Superpowers runtime, tests or workflow scratch added to package contents. Runtime APIs and existing repair-result contracts remain unchanged.
- Full suite and native host trials were not repeated for this catalog/procedure change. Existing installations remain untouched and changes are uncommitted.
- Preserved unrelated untracked `docs/superpowers/specs/2026-11-08-skill-evidence-and-simplicity-design.md` untouched.
