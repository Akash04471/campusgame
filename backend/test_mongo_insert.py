import asyncio
from app.db.session import init_db
from app.db.models.user import User

async def main():
    await init_db()
    u = User(user_id=101, username="campus_hero", email="hero@christ.edu", hashed_password="hashed_secret")
    await u.insert()
    users = await User.find_all().to_list()
    print(f"SUCCESS: Inserted document into MongoDB! Total users in collection: {len(users)}")

if __name__ == "__main__":
    asyncio.run(main())
