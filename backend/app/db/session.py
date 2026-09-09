from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

client: AsyncIOMotorClient = None

async def init_db():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_database(settings.MONGODB_DB_NAME)
    
    from app.db.models.user import User
    from app.db.models.game import GameSession, UserGameStats
    
    await init_beanie(
        database=db,
        document_models=[User, GameSession, UserGameStats]
    )

async def close_db():
    global client
    if client:
        client.close()
