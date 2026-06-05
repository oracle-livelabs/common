# LiveLabs Analytics API

This API is for the OCI VM deployment. It runs on localhost and is exposed only through Nginx at `/api/`.

## Endpoints

- `GET /api/health` returns a safe service health response.
- `GET /api/health/db` checks Autonomous Database connectivity with the VM wallet and environment variables.

## Runtime Configuration

Set these values on the VM in the protected systemd environment file:

```text
HOST=127.0.0.1
PORT=3000
TNS_ADMIN=/opt/oci/wallets/LiveLabsAnalyticsDB
DB_CONNECT_STRING=livelabsanalyticsdb_low
DB_CONNECT_TIMEOUT_SECONDS=8
DB_HEALTH_TIMEOUT_SECONDS=12
ORACLEDB_THICK_MODE=1
DB_USER=REPLACE_ME
DB_PASSWORD=REPLACE_ME
DB_WALLET_PASSWORD=REPLACE_ME
```

Do not put database credentials or wallet files in frontend code, Git, or the web root.
