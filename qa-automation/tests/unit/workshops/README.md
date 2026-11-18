# Workshop unit coverage

No workshop-specific application unit suite is owned by this framework today.
Keep deterministic framework utilities in `../../unit`; place source-owned
unit tests beside a workshop application's own code and invoke that package's
test command through a dedicated runner when an applicable source suite exists.
