# LiveStack unit-test lane

This directory is the QA Automation home for LiveStack unit-test planning and
the central runner contract. Source-specific unit tests remain next to the
modules they exercise in `oracle-livelabs/livestack`; the framework runner
invokes those package-owned suites without copying or stubbing application
code.

Set `QA_LIVESTACK_ROOT` to a local checkout of
[`oracle-livelabs/livestack`](https://github.com/oracle-livelabs/livestack),
then run from the `qa-automation` directory:

```powershell
$env:QA_LIVESTACK_ROOT = "C:\path\to\livestack"
npm run test:unit:livestack
```

Or pass the source checkout path directly:

```powershell
npm run test:unit:livestack -- --repo-root "C:\path\to\livestack"
```

The runner currently wraps the existing AI Lakehouse ingestion backend suite
and Finance LiveStack application suite. The inventory and expansion plan are
in [`UNIT-TEST-PLAN.md`](UNIT-TEST-PLAN.md).
