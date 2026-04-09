CREATE KEYSPACE IF NOT EXISTS xclone
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE xclone;

CREATE TABLE IF NOT EXISTS users (
    user_id   uuid PRIMARY KEY,
    username     text,
    display_name text,
    bio          text,
    created_at   timestamp
);

CREATE TABLE IF NOT EXISTS users_by_username (
    username     text PRIMARY KEY,
    user_id      uuid,
    display_name text,
    bio          text,
    created_at   timestamp
);

CREATE TABLE IF NOT EXISTS tweets_by_user (
    user_id      uuid,
    tweet_id     timeuuid,
    content      text,
    display_name text,
    username     text,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

CREATE TABLE IF NOT EXISTS home_timeline (
    user_id      uuid,
    tweet_id     timeuuid,
    content      text,
    author_id    uuid,
    display_name text,
    username     text,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

CREATE TABLE IF NOT EXISTS following (
    user_id    uuid,
    followee_id uuid,
    PRIMARY KEY (user_id, followee_id)
);

CREATE TABLE IF NOT EXISTS followers (
    user_id     uuid,
    follower_id uuid,
    PRIMARY KEY (user_id, follower_id)
);

CREATE TABLE IF NOT EXISTS tweets_by_hashtag (
    tag          text,
    bucket       text,
    tweet_id     timeuuid,
    content      text,
    author_id    uuid,
    display_name text,
    username     text,
    PRIMARY KEY ((tag, bucket), tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);

CREATE TABLE IF NOT EXISTS tweet_likes (
    tweet_id   timeuuid PRIMARY KEY,
    like_count counter
);
