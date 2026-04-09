import os
import time
import logging
from pathlib import Path
from cassandra.cluster import Cluster, Session
from cassandra.policies import DCAwareRoundRobinPolicy

log = logging.getLogger("xclone.db")

_session: Session | None = None
_cluster: Cluster | None = None


def _split_statements(cql_text: str) -> list[str]:
    # naive splitter: strip comments, split on ';'
    lines = []
    for line in cql_text.splitlines():
        s = line.strip()
        if s.startswith("--"):
            continue
        lines.append(line)
    text = "\n".join(lines)
    return [s.strip() for s in text.split(";") if s.strip()]


def connect() -> Session:
    global _session, _cluster
    if _session is not None:
        return _session

    hosts = os.getenv("SCYLLA_HOSTS", "scylla").split(",")
    port = int(os.getenv("SCYLLA_PORT", "9042"))
    keyspace = os.getenv("SCYLLA_KEYSPACE", "xclone")

    last_err = None
    for attempt in range(40):
        try:
            cluster = Cluster(
                contact_points=hosts,
                port=port,
                load_balancing_policy=DCAwareRoundRobinPolicy(),
                protocol_version=4,
            )
            session = cluster.connect()
            # Apply schema
            schema_path = Path("/app/schema.cql")
            if schema_path.exists():
                for stmt in _split_statements(schema_path.read_text()):
                    try:
                        session.execute(stmt)
                    except Exception as e:
                        # ALTER TABLE fails if column already exists — safe to ignore
                        log.warning("Schema statement skipped (%s): %.120s", type(e).__name__, stmt)
            session.set_keyspace(keyspace)
            _cluster = cluster
            _session = session
            log.info("Connected to Scylla after %d attempts", attempt + 1)
            return session
        except Exception as e:  # noqa: BLE001
            last_err = e
            log.warning("Scylla not ready (attempt %d): %s", attempt + 1, e)
            time.sleep(3)
    raise RuntimeError(f"Could not connect to Scylla: {last_err}")


def get_session() -> Session:
    if _session is None:
        return connect()
    return _session


def healthcheck() -> bool:
    try:
        s = get_session()
        row = s.execute("SELECT now() FROM system.local").one()
        return row is not None
    except Exception:  # noqa: BLE001
        return False
