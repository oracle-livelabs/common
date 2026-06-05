#!/usr/bin/env python3
"""Small localhost API for the LiveLabs Analytics deployment."""

from __future__ import annotations

import json
import logging
import multiprocessing
import os
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from queue import Empty
from typing import Any
from urllib.parse import urlparse


PLACEHOLDER_VALUES = {"", "REPLACE_ME", "CHANGE_ME", "TODO"}


def env_value(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def is_placeholder(value: str) -> bool:
    return value.strip().upper() in PLACEHOLDER_VALUES


def json_body(handler: BaseHTTPRequestHandler, status: HTTPStatus, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    handler.send_response(status.value)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    try:
        handler.wfile.write(body)
    except BrokenPipeError:
        logging.warning("Client disconnected before response was written")


def env_float(name: str, default: float) -> float:
    value = env_value(name)
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def env_flag(name: str, default: bool = False) -> bool:
    value = env_value(name)
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def database_health_attempt() -> tuple[HTTPStatus, dict[str, Any]]:
    required = {
        "DB_USER": env_value("DB_USER"),
        "DB_PASSWORD": env_value("DB_PASSWORD"),
        "DB_CONNECT_STRING": env_value("DB_CONNECT_STRING"),
        "TNS_ADMIN": env_value("TNS_ADMIN"),
    }
    missing = [name for name, value in required.items() if is_placeholder(value)]
    if missing:
        return HTTPStatus.SERVICE_UNAVAILABLE, {
            "configured": False,
            "missing": missing,
            "status": "error",
        }

    wallet_dir = Path(required["TNS_ADMIN"])
    if not wallet_dir.is_dir():
        return HTTPStatus.SERVICE_UNAVAILABLE, {
            "configured": False,
            "reason": "wallet_directory_unavailable",
            "status": "error",
        }

    try:
        import oracledb  # type: ignore[import-not-found]
    except Exception:
        logging.exception("Oracle driver import failed")
        return HTTPStatus.SERVICE_UNAVAILABLE, {
            "configured": True,
            "reason": "oracle_driver_unavailable",
            "status": "error",
        }

    connect_args: dict[str, Any] = {
        "user": required["DB_USER"],
        "password": required["DB_PASSWORD"],
        "dsn": required["DB_CONNECT_STRING"],
    }

    if env_flag("ORACLEDB_THICK_MODE"):
        oracledb.init_oracle_client(config_dir=str(wallet_dir))
    else:
        connect_args.update(
            {
                "config_dir": str(wallet_dir),
                "retry_count": 0,
                "retry_delay": 0,
                "tcp_connect_timeout": env_float("DB_CONNECT_TIMEOUT_SECONDS", 8.0),
                "wallet_location": str(wallet_dir),
            }
        )
        wallet_password = env_value("DB_WALLET_PASSWORD")
        if not is_placeholder(wallet_password):
            connect_args["wallet_password"] = wallet_password

    try:
        with oracledb.connect(**connect_args) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select 1 from dual")
                cursor.fetchone()
    except Exception as exc:
        logging.warning("Database health check failed: %s", exc.__class__.__name__)
        return HTTPStatus.SERVICE_UNAVAILABLE, {
            "configured": True,
            "reason": exc.__class__.__name__,
            "status": "error",
        }

    return HTTPStatus.OK, {
        "configured": True,
        "database": "reachable",
        "status": "ok",
    }


def database_health_worker(queue: multiprocessing.Queue) -> None:
    try:
        status, payload = database_health_attempt()
        queue.put((status.value, payload))
    except Exception as exc:
        logging.warning("Database health worker failed: %s", exc.__class__.__name__)
        queue.put(
            (
                HTTPStatus.SERVICE_UNAVAILABLE.value,
                {
                    "configured": True,
                    "reason": exc.__class__.__name__,
                    "status": "error",
                },
            )
        )


def database_health() -> tuple[HTTPStatus, dict[str, Any]]:
    timeout_seconds = env_float("DB_HEALTH_TIMEOUT_SECONDS", 12.0)
    queue: multiprocessing.Queue = multiprocessing.Queue(maxsize=1)
    process = multiprocessing.Process(target=database_health_worker, args=(queue,))
    process.start()
    process.join(timeout_seconds)

    if process.is_alive():
        process.terminate()
        process.join(2)
        return HTTPStatus.SERVICE_UNAVAILABLE, {
            "configured": True,
            "reason": "database_check_timeout",
            "status": "error",
        }

    try:
        status_value, payload = queue.get_nowait()
    except Empty:
        return HTTPStatus.SERVICE_UNAVAILABLE, {
            "configured": True,
            "reason": "database_check_failed",
            "status": "error",
        }

    return HTTPStatus(status_value), payload


class AnalyticsApiHandler(BaseHTTPRequestHandler):
    server_version = "LiveLabsAnalyticsApi/1.0"

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            json_body(self, HTTPStatus.OK, {"service": "codex-analytics-api", "status": "ok"})
            return
        if path == "/api/health/db":
            status, payload = database_health()
            json_body(self, status, payload)
            return
        json_body(self, HTTPStatus.NOT_FOUND, {"status": "error"})

    def log_message(self, fmt: str, *args: Any) -> None:
        logging.info("%s - %s", self.address_string(), fmt % args)


def main() -> int:
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(levelname)s %(message)s")
    host = env_value("HOST", "127.0.0.1")
    port_text = env_value("PORT", "3000")
    try:
        port = int(port_text)
    except ValueError:
        logging.error("Invalid PORT value")
        return 2

    if host not in {"127.0.0.1", "localhost", "::1"}:
        logging.error("Refusing to bind to non-localhost HOST value")
        return 2

    httpd = ThreadingHTTPServer((host, port), AnalyticsApiHandler)
    logging.info("LiveLabs Analytics API listening on %s:%s", host, port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logging.info("Shutdown requested")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
