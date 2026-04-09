import os
import time
import logging
from cassandra.cluster import Cluster

logger = logging.getLogger(__name__)

SCYLLA_HOST = os.getenv("SCYLLA_HOST", "localhost")
KEYSPACE = "xclone"
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "..", "schema.cql")


def _connect_with_retry(max_retries: int = 30, delay: int = 5):
    cluster = Cluster([SCYLLA_HOST])
    for attempt in range(1, max_retries + 1):
        try:
            session = cluster.connect()
            logger.info("Connected to ScyllaDB on attempt %d", attempt)
            return session
        except Exception as exc:  # noqa: BLE001
            logger.warning("ScyllaDB not ready (attempt %d/%d): %s", attempt, max_retries, exc)
            if attempt == max_retries:
                cluster.shutdown()
                raise
            time.sleep(delay)


def apply_schema(session):
    with open(SCHEMA_FILE) as fh:
        raw = fh.read()
    statements = [s.strip() for s in raw.split(";") if s.strip()]
    for stmt in statements:
        session.execute(stmt)
    logger.info("Schema applied successfully")


def get_session():
    session = _connect_with_retry()
    apply_schema(session)
    session.set_keyspace(KEYSPACE)
    return session
