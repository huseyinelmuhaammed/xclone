from pydantic import BaseModel, Field
from typing import Optional


class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=32)
    display_name: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""
    banner_url: Optional[str] = ""


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    user_id: str
    username: str
    display_name: str
    bio: str = ""
    avatar_url: str = ""
    followers_count: int = 0
    following_count: int = 0


class TweetIn(BaseModel):
    user_id: str
    content: str = Field(min_length=1, max_length=280)
    image_url: Optional[str] = ""


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None


class ChangePasswordIn(BaseModel):
    username: str
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class TweetOut(BaseModel):
    tweet_id: str
    author_id: str
    author_username: str
    author_display_name: str
    content: str
    created_at: str
    like_count: int = 0


class FollowIn(BaseModel):
    follower_id: str
    followee_id: str


class ReplyIn(BaseModel):
    user_id: str
    content: str = Field(min_length=1, max_length=280)


class RepostIn(BaseModel):
    user_id: str


class BookmarkIn(BaseModel):
    user_id: str
    tweet_id: str
