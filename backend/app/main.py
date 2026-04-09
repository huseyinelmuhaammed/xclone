import re
import uuid
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
import bcrypt
from fastapi.middleware.cors import CORSMiddleware
from cassandra.util import uuid_from_time
from cassandra.query import SimpleStatement

from .db import connect, get_session, healthcheck
from .models import RegisterIn, LoginIn, TweetIn, FollowIn, UserUpdate, ReplyIn, RepostIn, BookmarkIn, ChangePasswordIn

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("xclone")

app = FastAPI(title="xclone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

HASHTAG_RE = re.compile(r"#(\w+)", re.UNICODE)
def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


@app.on_event("startup")
def startup():
    connect()


@app.get("/health")
def health():
    ok = healthcheck()
    if not ok:
        raise HTTPException(503, "scylla not reachable")
    return {"status": "ok", "scylla": "up"}


# ---------- helpers ----------

def _tweet_time(tid) -> str:
    # timeuuid -> datetime
    try:
        from cassandra.util import datetime_from_uuid1
        return datetime_from_uuid1(tid).replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return ""


def _like_count(s, tweet_id) -> int:
    row = s.execute("SELECT like_count FROM tweet_likes WHERE tweet_id=%s", (tweet_id,)).one()
    return int(row.like_count) if row and row.like_count is not None else 0


def _reply_count(s, tweet_id) -> int:
    row = s.execute("SELECT reply_count FROM tweet_reply_counts WHERE tweet_id=%s", (tweet_id,)).one()
    return int(row.reply_count) if row and row.reply_count is not None else 0


def _repost_count(s, tweet_id) -> int:
    row = s.execute("SELECT repost_count FROM tweet_reposts WHERE tweet_id=%s", (tweet_id,)).one()
    return int(row.repost_count) if row and row.repost_count is not None else 0


def _notify(s, user_id, ntype: str, actor, tweet_id=None, tweet_content=""):
    """Create a notification. actor is a DB row with username/display_name."""
    if user_id == actor.user_id:
        return  # don't notify yourself
    now = datetime.now(timezone.utc)
    nid = uuid_from_time(now)
    s.execute(
        "INSERT INTO notifications (user_id, notif_id, type, actor_id, actor_username, actor_display_name, tweet_id, tweet_content, is_read) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (user_id, nid, ntype, actor.user_id, actor.username, actor.display_name,
         tweet_id, (tweet_content or "")[:80], False),
    )


def _user_by_id(s, user_id: uuid.UUID):
    return s.execute("SELECT * FROM users WHERE user_id=%s", (user_id,)).one()


# ---------- register / user ----------

@app.post("/register", status_code=201)
def register(body: RegisterIn):
    s = get_session()
    existing = s.execute(
        "SELECT user_id FROM users_by_username WHERE username=%s", (body.username,)
    ).one()
    if existing:
        raise HTTPException(409, "username already exists")

    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    password_hash = _hash_password(body.password)
    s.execute(
        "INSERT INTO users (user_id, username, display_name, bio, avatar_url, banner_url, created_at, password_hash) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (user_id, body.username, body.display_name, body.bio or "", body.avatar_url or "", body.banner_url or "", now, password_hash),
    )
    s.execute(
        "INSERT INTO users_by_username (username, user_id, display_name, bio, avatar_url, banner_url, created_at, password_hash) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) IF NOT EXISTS",
        (body.username, user_id, body.display_name, body.bio or "", body.avatar_url or "", body.banner_url or "", now, password_hash),
    )
    return {
        "user_id": str(user_id),
        "username": body.username,
        "display_name": body.display_name,
        "bio": body.bio or "",
        "avatar_url": body.avatar_url or "",
        "banner_url": body.banner_url or "",
    }


@app.post("/login")
def login(body: LoginIn):
    s = get_session()
    row = s.execute(
        "SELECT user_id, username, display_name, bio, avatar_url, banner_url, password_hash "
        "FROM users_by_username WHERE username=%s",
        (body.username,),
    ).one()
    if not row or not row.password_hash:
        raise HTTPException(401, "Kullanıcı adı veya şifre hatalı")
    if not _verify_password(body.password, row.password_hash):
        raise HTTPException(401, "Kullanıcı adı veya şifre hatalı")
    followers = s.execute("SELECT COUNT(*) AS c FROM followers WHERE user_id=%s", (row.user_id,)).one()
    following = s.execute("SELECT COUNT(*) AS c FROM following WHERE user_id=%s", (row.user_id,)).one()
    return {
        "user_id": str(row.user_id),
        "username": row.username,
        "display_name": row.display_name,
        "bio": row.bio or "",
        "avatar_url": row.avatar_url or "",
        "banner_url": row.banner_url or "",
        "followers_count": int(followers.c) if followers else 0,
        "following_count": int(following.c) if following else 0,
    }


@app.get("/users/{username}")
def get_user(username: str):
    s = get_session()
    row = s.execute(
        "SELECT user_id, username, display_name, bio, avatar_url, banner_url, verified, website, location, created_at "
        "FROM users_by_username WHERE username=%s",
        (username,),
    ).one()
    if not row:
        raise HTTPException(404, "user not found")
    followers = s.execute("SELECT COUNT(*) AS c FROM followers WHERE user_id=%s", (row.user_id,)).one()
    following = s.execute("SELECT COUNT(*) AS c FROM following WHERE user_id=%s", (row.user_id,)).one()
    return {
        "user_id": str(row.user_id),
        "username": row.username,
        "display_name": row.display_name,
        "bio": row.bio or "",
        "avatar_url": row.avatar_url or "",
        "banner_url": row.banner_url or "",
        "verified": bool(row.verified) if row.verified is not None else False,
        "website": row.website or "",
        "location": row.location or "",
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "followers_count": int(followers.c) if followers else 0,
        "following_count": int(following.c) if following else 0,
    }


# ---------- tweets ----------

@app.post("/tweets", status_code=201)
def create_tweet(body: TweetIn):
    if len(body.content) > 280:
        raise HTTPException(400, "tweet too long")
    s = get_session()
    try:
        author_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(400, "invalid user_id")

    author = _user_by_id(s, author_uuid)
    if not author:
        raise HTTPException(404, "user not found")

    now = datetime.now(timezone.utc)
    tweet_id = uuid_from_time(now)
    img = body.image_url or ""

    # own tweets
    s.execute(
        "INSERT INTO tweets_by_user (user_id, tweet_id, username, display_name, content, image_url) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (author_uuid, tweet_id, author.username, author.display_name, body.content, img),
    )
    # self timeline
    s.execute(
        "INSERT INTO home_timeline (user_id, tweet_id, author_id, author_username, author_display_name, content, image_url) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (author_uuid, tweet_id, author_uuid, author.username, author.display_name, body.content, img),
    )
    # fan-out to followers
    followers = s.execute("SELECT follower_id FROM followers WHERE user_id=%s", (author_uuid,))
    for f in followers:
        s.execute(
            "INSERT INTO home_timeline (user_id, tweet_id, author_id, author_username, author_display_name, content, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (f.follower_id, tweet_id, author_uuid, author.username, author.display_name, body.content, img),
        )
    # hashtags
    bucket = now.strftime("%Y-%m-%d")
    for tag in set(HASHTAG_RE.findall(body.content)):
        s.execute(
            "INSERT INTO tweets_by_hashtag (tag, bucket, tweet_id, author_id, author_username, author_display_name, content, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (tag.lower(), bucket, tweet_id, author_uuid, author.username, author.display_name, body.content, img),
        )
    return {
        "tweet_id": str(tweet_id),
        "author_id": str(author_uuid),
        "author_username": author.username,
        "author_display_name": author.display_name,
        "content": body.content,
        "image_url": img,
        "created_at": now.isoformat(),
        "like_count": 0,
        "reply_count": 0,
        "repost_count": 0,
    }


@app.get("/users/{username}/tweets")
def user_tweets(username: str, limit: int = 50):
    s = get_session()
    u = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    if not u:
        raise HTTPException(404, "user not found")
    rows = s.execute(
        SimpleStatement(
            "SELECT tweet_id, username, display_name, content, image_url FROM tweets_by_user "
            "WHERE user_id=%s LIMIT %s"
        ),
        (u.user_id, limit),
    )
    out = []
    for r in rows:
        out.append({
            "tweet_id": str(r.tweet_id),
            "author_id": str(u.user_id),
            "author_username": r.username,
            "author_display_name": r.display_name,
            "content": r.content,
            "image_url": r.image_url or "",
            "created_at": _tweet_time(r.tweet_id),
            "like_count": _like_count(s, r.tweet_id),
            "reply_count": _reply_count(s, r.tweet_id),
            "repost_count": _repost_count(s, r.tweet_id),
        })
    return out


@app.get("/timeline/{user_id}")
def timeline(user_id: str, limit: int = 50):
    s = get_session()
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "invalid user_id")
    rows = s.execute(
        "SELECT tweet_id, author_id, author_username, author_display_name, content, image_url "
        "FROM home_timeline WHERE user_id=%s LIMIT %s",
        (uid, limit),
    )
    out = []
    for r in rows:
        out.append({
            "tweet_id": str(r.tweet_id),
            "author_id": str(r.author_id),
            "author_username": r.author_username,
            "author_display_name": r.author_display_name,
            "content": r.content,
            "image_url": r.image_url or "",
            "created_at": _tweet_time(r.tweet_id),
            "like_count": _like_count(s, r.tweet_id),
            "reply_count": _reply_count(s, r.tweet_id),
            "repost_count": _repost_count(s, r.tweet_id),
        })
    return out


# ---------- follow ----------

@app.post("/follow", status_code=201)
def follow(body: FollowIn):
    s = get_session()
    try:
        follower = uuid.UUID(body.follower_id)
        followee = uuid.UUID(body.followee_id)
    except ValueError:
        raise HTTPException(400, "invalid ids")
    if follower == followee:
        raise HTTPException(400, "cannot follow yourself")

    f_user = _user_by_id(s, follower)
    e_user = _user_by_id(s, followee)
    if not f_user or not e_user:
        raise HTTPException(404, "user not found")

    now = datetime.now(timezone.utc)
    s.execute(
        "INSERT INTO following (user_id, followee_id, followee_username, followed_at) VALUES (%s,%s,%s,%s)",
        (follower, followee, e_user.username, now),
    )
    s.execute(
        "INSERT INTO followers (user_id, follower_id, follower_username, followed_at) VALUES (%s,%s,%s,%s)",
        (followee, follower, f_user.username, now),
    )
    # notification to followee
    _notify(s, followee, "follow", f_user)

    # backfill followee's recent tweets into follower's home timeline
    recent = s.execute(
        "SELECT tweet_id, username, display_name, content, image_url FROM tweets_by_user "
        "WHERE user_id=%s LIMIT 50",
        (followee,),
    )
    for r in recent:
        s.execute(
            "INSERT INTO home_timeline (user_id, tweet_id, author_id, author_username, author_display_name, content, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (follower, r.tweet_id, followee, r.username, r.display_name, r.content, r.image_url or ""),
        )
    return {"status": "ok"}


@app.delete("/follow", status_code=200)
def unfollow(body: FollowIn):
    s = get_session()
    try:
        follower = uuid.UUID(body.follower_id)
        followee = uuid.UUID(body.followee_id)
    except ValueError:
        raise HTTPException(400, "invalid ids")

    s.execute("DELETE FROM following WHERE user_id=%s AND followee_id=%s", (follower, followee))
    s.execute("DELETE FROM followers WHERE user_id=%s AND follower_id=%s", (followee, follower))

    # remove followee's tweets from follower's home timeline
    rows = s.execute(
        "SELECT tweet_id FROM home_timeline WHERE user_id=%s", (follower,)
    )
    for r in rows:
        # check if this tweet belongs to the unfollowed user
        ht = s.execute(
            "SELECT author_id FROM home_timeline WHERE user_id=%s AND tweet_id=%s", (follower, r.tweet_id)
        ).one()
        if ht and ht.author_id == followee:
            s.execute("DELETE FROM home_timeline WHERE user_id=%s AND tweet_id=%s", (follower, r.tweet_id))
    return {"status": "ok"}


@app.get("/users/{username}/is-following/{target_username}")
def is_following(username: str, target_username: str):
    s = get_session()
    u1 = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    u2 = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (target_username,)).one()
    if not u1 or not u2:
        raise HTTPException(404, "user not found")
    row = s.execute(
        "SELECT followee_id FROM following WHERE user_id=%s AND followee_id=%s", (u1.user_id, u2.user_id)
    ).one()
    return {"following": row is not None}


# ---------- likes ----------

@app.post("/tweets/{tweet_id}/like", status_code=201)
def like_tweet(tweet_id: str, liker_id: str | None = Query(default=None)):
    s = get_session()
    try:
        tid = uuid.UUID(tweet_id)
    except ValueError:
        raise HTTPException(400, "invalid tweet_id")
    s.execute("UPDATE tweet_likes SET like_count = like_count + 1 WHERE tweet_id=%s", (tid,))

    # notification to tweet owner
    if liker_id:
        try:
            liker_uuid = uuid.UUID(liker_id)
            liker = _user_by_id(s, liker_uuid)
            if liker:
                # find tweet owner from home_timeline (author wrote it, so it's in their timeline)
                # search all users — find the original author
                all_u = s.execute("SELECT user_id FROM users")
                for u in all_u:
                    row = s.execute(
                        "SELECT content FROM tweets_by_user WHERE user_id=%s AND tweet_id=%s", (u.user_id, tid)
                    ).one()
                    if row:
                        _notify(s, u.user_id, "like", liker, tid, row.content)
                        break
        except Exception:
            pass

    return {"tweet_id": tweet_id, "like_count": _like_count(s, tid)}


@app.get("/tweets/{tweet_id}/likes")
def get_likes(tweet_id: str):
    s = get_session()
    try:
        tid = uuid.UUID(tweet_id)
    except ValueError:
        raise HTTPException(400, "invalid tweet_id")
    return {"tweet_id": tweet_id, "like_count": _like_count(s, tid)}


# ---------- replies ----------

@app.post("/tweets/{tweet_id}/replies", status_code=201)
def create_reply(tweet_id: str, body: ReplyIn):
    s = get_session()
    try:
        tid = uuid.UUID(tweet_id)
        author_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(400, "invalid id")

    author = _user_by_id(s, author_uuid)
    if not author:
        raise HTTPException(404, "user not found")

    now = datetime.now(timezone.utc)
    reply_id = uuid_from_time(now)

    s.execute(
        "INSERT INTO replies (parent_tweet_id, reply_id, author_id, author_username, author_display_name, content, image_url) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (tid, reply_id, author_uuid, author.username, author.display_name, body.content, ""),
    )
    s.execute("UPDATE tweet_reply_counts SET reply_count = reply_count + 1 WHERE tweet_id=%s", (tid,))

    # notification to tweet owner
    all_u = s.execute("SELECT user_id FROM users")
    for u in all_u:
        row = s.execute("SELECT content FROM tweets_by_user WHERE user_id=%s AND tweet_id=%s", (u.user_id, tid)).one()
        if row:
            _notify(s, u.user_id, "reply", author, tid, body.content)
            break

    return {
        "reply_id": str(reply_id),
        "parent_tweet_id": tweet_id,
        "author_id": str(author_uuid),
        "author_username": author.username,
        "author_display_name": author.display_name,
        "content": body.content,
        "created_at": now.isoformat(),
    }


@app.get("/tweets/{tweet_id}/replies")
def get_replies(tweet_id: str, limit: int = 50):
    s = get_session()
    try:
        tid = uuid.UUID(tweet_id)
    except ValueError:
        raise HTTPException(400, "invalid tweet_id")

    rows = s.execute(
        "SELECT reply_id, author_id, author_username, author_display_name, content FROM replies "
        "WHERE parent_tweet_id=%s LIMIT %s",
        (tid, limit),
    )
    out = []
    for r in rows:
        out.append({
            "reply_id": str(r.reply_id),
            "author_id": str(r.author_id),
            "author_username": r.author_username,
            "author_display_name": r.author_display_name,
            "content": r.content,
            "created_at": _tweet_time(r.reply_id),
        })
    return out


# ---------- reposts ----------

@app.post("/tweets/{tweet_id}/repost", status_code=201)
def repost_tweet(tweet_id: str, body: RepostIn):
    s = get_session()
    try:
        tid = uuid.UUID(tweet_id)
        user_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(400, "invalid id")

    user = _user_by_id(s, user_uuid)
    if not user:
        raise HTTPException(404, "user not found")

    # check if already reposted
    existing = s.execute(
        "SELECT tweet_id FROM user_reposts WHERE user_id=%s AND tweet_id=%s", (user_uuid, tid)
    ).one()
    if existing:
        raise HTTPException(409, "already reposted")

    now = datetime.now(timezone.utc)
    repost_tweet_id = uuid_from_time(now)

    # record the repost
    s.execute(
        "INSERT INTO user_reposts (user_id, tweet_id, reposted_at) VALUES (%s, %s, %s)",
        (user_uuid, tid, now),
    )
    s.execute("UPDATE tweet_reposts SET repost_count = repost_count + 1 WHERE tweet_id=%s", (tid,))

    # fetch original tweet content from tweets_by_user (need to find it)
    # We look it up from home_timeline or replies — simplest: get from any timeline
    # Instead, let frontend pass original tweet data. We just fan-out a repost to timeline.
    # For simplicity: insert the original tweet into reposter's followers' timelines
    # with the reposter's attribution

    # Get original tweet data from any available source
    orig = s.execute(
        "SELECT author_id, author_username, author_display_name, content, image_url FROM home_timeline WHERE user_id=%s AND tweet_id=%s",
        (user_uuid, tid),
    ).one()
    if not orig:
        # try tweets_by_user of the original author — we need to find it
        # fall back: search in any user's timeline
        all_ht = s.execute("SELECT author_id, author_username, author_display_name, content, image_url FROM home_timeline WHERE user_id=%s LIMIT 200", (user_uuid,))
        for row in all_ht:
            # not ideal but works
            pass
        raise HTTPException(404, "original tweet not found in your timeline")

    repost_content = f"🔁 @{user.username} yeniden paylaştı\n\n{orig.content}"

    # Add to reposter's own timeline
    s.execute(
        "INSERT INTO home_timeline (user_id, tweet_id, author_id, author_username, author_display_name, content, image_url) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (user_uuid, repost_tweet_id, orig.author_id, orig.author_username, orig.author_display_name, repost_content, orig.image_url or ""),
    )

    # Fan-out to reposter's followers
    followers = s.execute("SELECT follower_id FROM followers WHERE user_id=%s", (user_uuid,))
    for f in followers:
        s.execute(
            "INSERT INTO home_timeline (user_id, tweet_id, author_id, author_username, author_display_name, content, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (f.follower_id, repost_tweet_id, orig.author_id, orig.author_username, orig.author_display_name, repost_content, orig.image_url or ""),
        )

    # notification to original tweet owner
    _notify(s, orig.author_id, "repost", user, tid, orig.content)

    return {"status": "ok", "repost_count": _repost_count(s, tid)}


# ---------- hashtags ----------

@app.get("/hashtags/{tag}")
def get_hashtag(tag: str, date: str | None = Query(default=None), limit: int = 50):
    s = get_session()
    tag = tag.lower().lstrip("#")
    bucket = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = s.execute(
        "SELECT tweet_id, author_id, author_username, author_display_name, content, image_url "
        "FROM tweets_by_hashtag WHERE tag=%s AND bucket=%s LIMIT %s",
        (tag, bucket, limit),
    )
    out = []
    for r in rows:
        out.append({
            "tweet_id": str(r.tweet_id),
            "author_id": str(r.author_id),
            "author_username": r.author_username,
            "author_display_name": r.author_display_name,
            "content": r.content,
            "image_url": r.image_url or "",
            "created_at": _tweet_time(r.tweet_id),
            "like_count": _like_count(s, r.tweet_id),
            "reply_count": _reply_count(s, r.tweet_id),
            "repost_count": _repost_count(s, r.tweet_id),
        })
    return {"tag": tag, "bucket": bucket, "tweets": out}


@app.get("/users/{username}/followers")
def list_followers(username: str, limit: int = 200):
    s = get_session()
    row = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    if not row:
        raise HTTPException(404, "user not found")
    rows = s.execute(
        "SELECT follower_id, follower_username FROM followers WHERE user_id=%s LIMIT %s",
        (row.user_id, limit),
    )
    out = []
    for r in rows:
        u = _user_by_id(s, r.follower_id)
        if not u:
            continue
        out.append({
            "user_id": str(u.user_id),
            "username": u.username,
            "display_name": u.display_name,
            "bio": u.bio or "",
            "avatar_url": u.avatar_url or "",
        })
    return out


@app.get("/users/{username}/following")
def list_following(username: str, limit: int = 200):
    s = get_session()
    row = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    if not row:
        raise HTTPException(404, "user not found")
    rows = s.execute(
        "SELECT followee_id, followee_username FROM following WHERE user_id=%s LIMIT %s",
        (row.user_id, limit),
    )
    out = []
    for r in rows:
        u = _user_by_id(s, r.followee_id)
        if not u:
            continue
        out.append({
            "user_id": str(u.user_id),
            "username": u.username,
            "display_name": u.display_name,
            "bio": u.bio or "",
            "avatar_url": u.avatar_url or "",
        })
    return out


# ---------- notifications ----------

@app.get("/notifications/{user_id}")
def list_notifications(user_id: str, limit: int = 50):
    s = get_session()
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "invalid user_id")
    rows = s.execute(
        "SELECT notif_id, type, actor_id, actor_username, actor_display_name, tweet_id, tweet_content, is_read "
        "FROM notifications WHERE user_id=%s LIMIT %s", (uid, limit)
    )
    out = []
    for r in rows:
        out.append({
            "notif_id": str(r.notif_id),
            "type": r.type,
            "actor_id": str(r.actor_id),
            "actor_username": r.actor_username,
            "actor_display_name": r.actor_display_name,
            "tweet_id": str(r.tweet_id) if r.tweet_id else None,
            "tweet_content": r.tweet_content or "",
            "is_read": r.is_read,
            "created_at": _tweet_time(r.notif_id),
        })
    return out


@app.get("/notifications/{user_id}/unread-count")
def unread_count(user_id: str):
    s = get_session()
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "invalid user_id")
    rows = s.execute("SELECT notif_id, is_read FROM notifications WHERE user_id=%s", (uid,))
    count = sum(1 for r in rows if not r.is_read)
    return {"count": count}


@app.post("/notifications/{user_id}/read-all")
def read_all_notifications(user_id: str):
    s = get_session()
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "invalid user_id")
    rows = s.execute("SELECT notif_id FROM notifications WHERE user_id=%s", (uid,))
    for r in rows:
        s.execute("UPDATE notifications SET is_read=true WHERE user_id=%s AND notif_id=%s", (uid, r.notif_id))
    return {"status": "ok"}


# ---------- bookmarks ----------

@app.post("/bookmarks", status_code=201)
def add_bookmark(body: BookmarkIn):
    s = get_session()
    try:
        user_uuid = uuid.UUID(body.user_id)
        tid = uuid.UUID(body.tweet_id)
    except ValueError:
        raise HTTPException(400, "invalid id")

    # find tweet data from home_timeline or tweets_by_user
    tweet = s.execute(
        "SELECT author_id, author_username, author_display_name, content, image_url "
        "FROM home_timeline WHERE user_id=%s AND tweet_id=%s", (user_uuid, tid)
    ).one()
    if not tweet:
        # try all users' tweets
        all_users = s.execute("SELECT user_id FROM users")
        for u in all_users:
            tweet = s.execute(
                "SELECT username AS author_username, display_name AS author_display_name, content, image_url "
                "FROM tweets_by_user WHERE user_id=%s AND tweet_id=%s", (u.user_id, tid)
            ).one()
            if tweet:
                tweet = type('obj', (object,), {
                    'author_id': u.user_id,
                    'author_username': tweet.author_username,
                    'author_display_name': tweet.author_display_name,
                    'content': tweet.content,
                    'image_url': tweet.image_url,
                })()
                break
    if not tweet:
        raise HTTPException(404, "tweet not found")

    now = datetime.now(timezone.utc)
    s.execute(
        "INSERT INTO bookmarks (user_id, tweet_id, author_id, author_username, author_display_name, content, image_url, bookmarked_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (user_uuid, tid, tweet.author_id, tweet.author_username, tweet.author_display_name, tweet.content, tweet.image_url or "", now),
    )
    return {"status": "ok"}


@app.delete("/bookmarks")
def remove_bookmark(body: BookmarkIn):
    s = get_session()
    try:
        user_uuid = uuid.UUID(body.user_id)
        tid = uuid.UUID(body.tweet_id)
    except ValueError:
        raise HTTPException(400, "invalid id")
    s.execute("DELETE FROM bookmarks WHERE user_id=%s AND tweet_id=%s", (user_uuid, tid))
    return {"status": "ok"}


@app.get("/bookmarks/{user_id}")
def list_bookmarks(user_id: str, limit: int = 100):
    s = get_session()
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "invalid user_id")
    rows = s.execute(
        "SELECT tweet_id, author_id, author_username, author_display_name, content, image_url "
        "FROM bookmarks WHERE user_id=%s LIMIT %s", (uid, limit)
    )
    out = []
    for r in rows:
        out.append({
            "tweet_id": str(r.tweet_id),
            "author_id": str(r.author_id),
            "author_username": r.author_username,
            "author_display_name": r.author_display_name,
            "content": r.content,
            "image_url": r.image_url or "",
            "created_at": _tweet_time(r.tweet_id),
            "like_count": _like_count(s, r.tweet_id),
            "reply_count": _reply_count(s, r.tweet_id),
            "repost_count": _repost_count(s, r.tweet_id),
        })
    return out


@app.get("/bookmarks/{user_id}/{tweet_id}")
def is_bookmarked(user_id: str, tweet_id: str):
    s = get_session()
    try:
        uid = uuid.UUID(user_id)
        tid = uuid.UUID(tweet_id)
    except ValueError:
        raise HTTPException(400, "invalid id")
    row = s.execute("SELECT tweet_id FROM bookmarks WHERE user_id=%s AND tweet_id=%s", (uid, tid)).one()
    return {"bookmarked": row is not None}


# ---------- profile edit / delete ----------

@app.patch("/users/{username}")
def update_user(username: str, body: UserUpdate):
    s = get_session()
    row = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    if not row:
        raise HTTPException(404, "user not found")
    uid = row.user_id

    sets = []
    vals = []
    for field in ("display_name", "bio", "avatar_url", "banner_url", "website", "location"):
        val = getattr(body, field)
        if val is not None:
            sets.append(f"{field}=%s")
            vals.append(val)
    if not sets:
        raise HTTPException(400, "nothing to update")

    s.execute(f"UPDATE users SET {', '.join(sets)} WHERE user_id=%s", (*vals, uid))
    s.execute(f"UPDATE users_by_username SET {', '.join(sets)} WHERE username=%s", (*vals, username))
    return get_user(username)


@app.post("/users/{username}/verify")
def toggle_verify(username: str):
    s = get_session()
    row = s.execute("SELECT user_id, verified FROM users_by_username WHERE username=%s", (username,)).one()
    if not row:
        raise HTTPException(404, "user not found")
    new_val = not bool(row.verified) if row.verified is not None else True
    s.execute("UPDATE users SET verified=%s WHERE user_id=%s", (new_val, row.user_id))
    s.execute("UPDATE users_by_username SET verified=%s WHERE username=%s", (new_val, username))
    return {"verified": new_val}


@app.post("/auth/change-password")
def change_password(body: ChangePasswordIn):
    s = get_session()
    row = s.execute(
        "SELECT user_id, password_hash FROM users_by_username WHERE username=%s", (body.username,)
    ).one()
    if not row or not row.password_hash:
        raise HTTPException(404, "user not found")
    if not _verify_password(body.current_password, row.password_hash):
        raise HTTPException(401, "Mevcut şifre hatalı")
    new_hash = _hash_password(body.new_password)
    s.execute("UPDATE users SET password_hash=%s WHERE user_id=%s", (new_hash, row.user_id))
    s.execute("UPDATE users_by_username SET password_hash=%s WHERE username=%s", (new_hash, body.username))
    return {"status": "ok"}


@app.delete("/tweets/{tweet_id}", status_code=204)
def delete_tweet(tweet_id: str, user_id: str = Query(...)):
    s = get_session()
    try:
        tid = uuid.UUID(tweet_id)
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "invalid id")
    row = s.execute(
        "SELECT content FROM tweets_by_user WHERE user_id=%s AND tweet_id=%s", (uid, tid)
    ).one()
    if not row:
        raise HTTPException(404, "tweet not found or not owner")
    s.execute("DELETE FROM tweets_by_user WHERE user_id=%s AND tweet_id=%s", (uid, tid))
    s.execute("DELETE FROM home_timeline WHERE user_id=%s AND tweet_id=%s", (uid, tid))
    followers = s.execute("SELECT follower_id FROM followers WHERE user_id=%s", (uid,))
    for f in followers:
        s.execute("DELETE FROM home_timeline WHERE user_id=%s AND tweet_id=%s", (f.follower_id, tid))
    try:
        from cassandra.util import datetime_from_uuid1
        bucket = datetime_from_uuid1(tid).strftime("%Y-%m-%d")
        for tag in HASHTAG_RE.findall(row.content or ""):
            s.execute("DELETE FROM tweets_by_hashtag WHERE tag=%s AND bucket=%s AND tweet_id=%s", (tag.lower(), bucket, tid))
    except Exception:
        pass
    return


@app.get("/users/{username}/suggestions")
def user_suggestions(username: str, limit: int = 3):
    import random
    s = get_session()
    row = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    if not row:
        raise HTTPException(404, "user not found")
    uid = row.user_id
    following_ids = {r.followee_id for r in s.execute("SELECT followee_id FROM following WHERE user_id=%s", (uid,))}
    following_ids.add(uid)
    all_users = list(s.execute("SELECT user_id, username, display_name, bio, avatar_url, verified FROM users LIMIT 100"))
    candidates = [u for u in all_users if u.user_id not in following_ids]
    random.shuffle(candidates)
    return [{
        "user_id": str(u.user_id),
        "username": u.username,
        "display_name": u.display_name or "",
        "bio": u.bio or "",
        "avatar_url": u.avatar_url or "",
        "banner_url": "",
        "verified": bool(u.verified) if u.verified is not None else False,
    } for u in candidates[:limit]]


@app.delete("/users/{username}", status_code=204)
def delete_user(username: str):
    s = get_session()
    row = s.execute("SELECT user_id FROM users_by_username WHERE username=%s", (username,)).one()
    if not row:
        raise HTTPException(404, "user not found")
    uid = row.user_id

    # clean follow graph (both sides)
    following = list(s.execute("SELECT followee_id FROM following WHERE user_id=%s", (uid,)))
    for f in following:
        s.execute("DELETE FROM followers WHERE user_id=%s AND follower_id=%s", (f.followee_id, uid))
    followers_rows = list(s.execute("SELECT follower_id FROM followers WHERE user_id=%s", (uid,)))
    for f in followers_rows:
        s.execute("DELETE FROM following WHERE user_id=%s AND followee_id=%s", (f.follower_id, uid))
    s.execute("DELETE FROM following WHERE user_id=%s", (uid,))
    s.execute("DELETE FROM followers WHERE user_id=%s", (uid,))

    # clean own tweets and self timeline
    s.execute("DELETE FROM tweets_by_user WHERE user_id=%s", (uid,))
    s.execute("DELETE FROM home_timeline WHERE user_id=%s", (uid,))

    # canonical records
    s.execute("DELETE FROM users WHERE user_id=%s", (uid,))
    s.execute("DELETE FROM users_by_username WHERE username=%s", (username,))
    return
