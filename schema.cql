CREATE KEYSPACE IF NOT EXISTS xclone
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE xclone;

-- Canonical user record keyed by user_id (UUID)
CREATE TABLE IF NOT EXISTS users (
    user_id uuid PRIMARY KEY,
    username text,
    display_name text,
    bio text,
    avatar_url text,
    banner_url text,
    created_at timestamp,
    password_hash text
);

-- Username uniqueness + login lookup
CREATE TABLE IF NOT EXISTS users_by_username (
    username text PRIMARY KEY,
    user_id uuid,
    display_name text,
    bio text,
    avatar_url text,
    banner_url text,
    created_at timestamp,
    password_hash text
);

-- A user's own tweets (profile page). Clustered DESC by time.
CREATE TABLE IF NOT EXISTS tweets_by_user (
    user_id uuid,
    tweet_id timeuuid,
    username text,
    display_name text,
    content text,
    image_url text,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

-- Fan-out home timeline. One row per (follower, tweet).
CREATE TABLE IF NOT EXISTS home_timeline (
    user_id uuid,
    tweet_id timeuuid,
    author_id uuid,
    author_username text,
    author_display_name text,
    content text,
    image_url text,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

-- Who I follow
CREATE TABLE IF NOT EXISTS following (
    user_id uuid,
    followee_id uuid,
    followee_username text,
    followed_at timestamp,
    PRIMARY KEY (user_id, followee_id)
);

-- Who follows me
CREATE TABLE IF NOT EXISTS followers (
    user_id uuid,
    follower_id uuid,
    follower_username text,
    followed_at timestamp,
    PRIMARY KEY (user_id, follower_id)
);

-- Hashtag stream, bucketed by day to bound partition size
CREATE TABLE IF NOT EXISTS tweets_by_hashtag (
    tag text,
    bucket text,            -- 'YYYY-MM-DD'
    tweet_id timeuuid,
    author_id uuid,
    author_username text,
    author_display_name text,
    content text,
    image_url text,
    PRIMARY KEY ((tag, bucket), tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

-- Replies to a tweet
CREATE TABLE IF NOT EXISTS replies (
    parent_tweet_id timeuuid,
    reply_id timeuuid,
    author_id uuid,
    author_username text,
    author_display_name text,
    content text,
    image_url text,
    PRIMARY KEY (parent_tweet_id, reply_id)
) WITH CLUSTERING ORDER BY (reply_id DESC);

-- Repost counters
CREATE TABLE IF NOT EXISTS tweet_reposts (
    tweet_id timeuuid PRIMARY KEY,
    repost_count counter
);

-- Track who reposted what (to prevent double repost)
CREATE TABLE IF NOT EXISTS user_reposts (
    user_id uuid,
    tweet_id timeuuid,
    reposted_at timestamp,
    PRIMARY KEY (user_id, tweet_id)
);

-- Reply counters
CREATE TABLE IF NOT EXISTS tweet_reply_counts (
    tweet_id timeuuid PRIMARY KEY,
    reply_count counter
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    user_id uuid,
    notif_id timeuuid,
    type text,           -- 'like', 'reply', 'repost', 'follow'
    actor_id uuid,
    actor_username text,
    actor_display_name text,
    tweet_id timeuuid,   -- nullable, for follow type
    tweet_content text,  -- short preview
    is_read boolean,
    PRIMARY KEY (user_id, notif_id)
) WITH CLUSTERING ORDER BY (notif_id DESC);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    user_id uuid,
    tweet_id timeuuid,
    author_id uuid,
    author_username text,
    author_display_name text,
    content text,
    image_url text,
    bookmarked_at timestamp,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

-- Like counters (separate because counter columns cannot coexist with non-counter)
CREATE TABLE IF NOT EXISTS tweet_likes (
    tweet_id timeuuid PRIMARY KEY,
    like_count counter
);

-- Migrations
ALTER TABLE users ADD password_hash text;
ALTER TABLE users_by_username ADD password_hash text;
ALTER TABLE users ADD verified boolean;
ALTER TABLE users_by_username ADD verified boolean;
ALTER TABLE users ADD website text;
ALTER TABLE users_by_username ADD website text;
ALTER TABLE users ADD location text;
ALTER TABLE users_by_username ADD location text;
