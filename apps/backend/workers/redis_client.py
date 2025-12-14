import redis.asyncio as redis
import redis as sync_redis
from app.core.config import settings
from typing import Optional

# Redis client instances
redis_client: Optional[redis.Redis] = None
sync_redis_client: Optional[sync_redis.Redis] = None


async def get_redis() -> redis.Redis:
    """
    Get async Redis client instance.

    Returns:
        redis.Redis: Async Redis client instance
    """
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            "redis://localhost:6380", encoding="utf-8", decode_responses=True
        )
    return redis_client


def get_redis_client() -> sync_redis.Redis:
    """
    Get synchronous Redis client instance.

    Used by background jobs that don't run in async context.

    Returns:
        redis.Redis: Synchronous Redis client instance
    """
    global sync_redis_client
    if sync_redis_client is None:
        sync_redis_client = sync_redis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
    return sync_redis_client


async def close_redis():
    """Close async Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


def close_redis_client():
    """Close synchronous Redis connection."""
    global sync_redis_client
    if sync_redis_client:
        sync_redis_client.close()
        sync_redis_client = None
