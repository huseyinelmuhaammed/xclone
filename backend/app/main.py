from __future__ import annotations

import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from cassandra.util import uuid_from_time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import get_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="xclone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# DB session (module-level singleton)
# ---------------------------------------------------------------------------
_session = None


def session():
    global _session
    if _session is None:
        _session = get_session()
    return _session


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    username: str
    display_name: str
    bio: Optional[str] = ""


class TweetRequest(BaseModel):
    user_id: str
    content: str


class FollowRequest(BaseModel):
    follower_id: str
    followee_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
HASHTAG_RE = re.compile(r"#(\w+)", re.UNICODE)


def _parse_hashtags(content: str) -> list[str]:
    return [m.lower() for m in HASHTAG_RE.findall(content)]


def _today_bucket() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    try:
        session().execute("SELECT now() FROM system.local")
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/register", status_code=201)
def register(req: RegisterRequest):
    db = session()
    existing = db.execute(
        "SELECT user_id FROM users_by_username WHERE username=%s", (req.username,)
    ).one()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    db.execute(
        "INSERT INTO users (user_id, username, display_name, bio, created_at) VALUES (%s,%s,%s,%s,%s)",
        (user_id, req.username, req.display_name, req.bio, now),
    )
    db.execute(
        "INSERT INTO users_by_username (username, user_id, display_name, bio, created_at) VALUES (%s,%s,%s,%s,%s)",
        (req.username, user_id, req.display_name, req.bio, now),
    )
    return {"user_id": str(user_id), "username": req.username, "display_name": req.display_name}


@app.get("/users/{username}")
def get_user(username: str):
    db = session()
    row = db.execute(
        "SELECT user_id, username, display_name, bio, created_at FROM users_by_username WHERE username=%s",
        (username,),
    ).one()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = row.user_id
    following_count = db.execute(
        "SELECT COUNT(*) FROM following WHERE user_id=%s", (user_id,)
    ).one()[0]
    followers_count = db.execute(
        "SELECT COUNT(*) FROM followers WHERE user_id=%s", (user_id,)
    ).one()[0]

    return {
        "user_id": str(user_id),
        "username": row.username,
        "display_name": row.display_name,
        "bio": row.bio or "",
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "following_count": following_count,
        "followers_count": followers_count,
    }


@app.post("/tweets", status_code=201)
def create_tweet(req: TweetRequest):
    if len(req.content) > 280:
        raise HTTPException(status_code=422, detail="Tweet exceeds 280 characters")

    db = session()
    try:
        author_uid = uuid.UUID(req.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid user_id") from exc

    user_row = db.execute(
        "SELECT username, display_name FROM users WHERE user_id=%s", (author_uid,)
    ).one()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    tweet_id = uuid_from_time(datetime.now(timezone.utc))

    # Write to tweets_by_user
    db.execute(
        "INSERT INTO tweets_by_user (user_id, tweet_id, content, display_name, username) VALUES (%s,%s,%s,%s,%s)",
        (author_uid, tweet_id, req.content, user_row.display_name, user_row.username),
    )

    # Fan-out to followers' home_timeline
    followers_rows = db.execute(
        "SELECT follower_id FROM followers WHERE user_id=%s", (author_uid,)
    )
    for frow in followers_rows:
        db.execute(
            "INSERT INTO home_timeline (user_id, tweet_id, content, author_id, display_name, username) VALUES (%s,%s,%s,%s,%s,%s)",
            (frow.follower_id, tweet_id, req.content, author_uid, user_row.display_name, user_row.username),
        )

    # Also add to author's own timeline
    db.execute(
        "INSERT INTO home_timeline (user_id, tweet_id, content, author_id, display_name, username) VALUES (%s,%s,%s,%s,%s,%s)",
        (author_uid, tweet_id, req.content, author_uid, user_row.display_name, user_row.username),
    )

    # Hashtag fan-out
    bucket = _today_bucket()
    for tag in _parse_hashtags(req.content):
        db.execute(
            "INSERT INTO tweets_by_hashtag (tag, bucket, tweet_id, content, author_id, display_name, username) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (tag, bucket, tweet_id, req.content, author_uid, user_row.display_name, user_row.username),
        )

    return {"tweet_id": str(tweet_id)}


@app.get("/users/{username}/tweets")
def get_user_tweets(username: str):
    db = session()
    user_row = db.execute(
        "SELECT user_id FROM users_by_username WHERE username=%s", (username,)
    ).one()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    rows = db.execute(
        "SELECT tweet_id, content, display_name, username FROM tweets_by_user WHERE user_id=%s",
        (user_row.user_id,),
    )
    return [
        {
            "tweet_id": str(r.tweet_id),
            "content": r.content,
            "display_name": r.display_name,
            "username": r.username,
        }
        for r in rows
    ]


@app.get("/timeline/{user_id}")
def get_timeline(user_id: str):
    db = session()
    try:
        uid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid user_id") from exc

    rows = db.execute(
        "SELECT tweet_id, content, author_id, display_name, username FROM home_timeline WHERE user_id=%s",
        (uid,),
    )
    return [
        {
            "tweet_id": str(r.tweet_id),
            "content": r.content,
            "author_id": str(r.author_id),
            "display_name": r.display_name,
            "username": r.username,
        }
        for r in rows
    ]


@app.post("/follow", status_code=201)
def follow(req: FollowRequest):
    db = session()
    try:
        follower_uid = uuid.UUID(req.follower_id)
        followee_uid = uuid.UUID(req.followee_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid UUID") from exc

    db.execute(
        "INSERT INTO following (user_id, followee_id) VALUES (%s,%s)",
        (follower_uid, followee_uid),
    )
    db.execute(
        "INSERT INTO followers (user_id, follower_id) VALUES (%s,%s)",
        (followee_uid, follower_uid),
    )
    return {"status": "ok"}


@app.post("/tweets/{tweet_id}/like", status_code=200)
def like_tweet(tweet_id: str):
    db = session()
    try:
        tid = uuid.UUID(tweet_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid tweet_id") from exc

    db.execute(
        "UPDATE tweet_likes SET like_count = like_count + 1 WHERE tweet_id=%s", (tid,)
    )
    return {"status": "ok"}


@app.get("/tweets/{tweet_id}/likes")
def get_likes(tweet_id: str):
    db = session()
    try:
        tid = uuid.UUID(tweet_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid tweet_id") from exc

    row = db.execute(
        "SELECT like_count FROM tweet_likes WHERE tweet_id=%s", (tid,)
    ).one()
    return {"tweet_id": tweet_id, "like_count": row.like_count if row else 0}


@app.get("/hashtags/{tag}")
def get_hashtag_tweets(tag: str, date: Optional[str] = None):
    db = session()
    bucket = date if date else _today_bucket()
    rows = db.execute(
        "SELECT tweet_id, content, author_id, display_name, username FROM tweets_by_hashtag WHERE tag=%s AND bucket=%s",
        (tag.lower(), bucket),
    )
    return [
        {
            "tweet_id": str(r.tweet_id),
            "content": r.content,
            "author_id": str(r.author_id),
            "display_name": r.display_name,
            "username": r.username,
            "tag": tag,
            "bucket": bucket,
        }
        for r in rows
    ]
