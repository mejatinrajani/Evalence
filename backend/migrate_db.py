import database
from sqlalchemy import text

def run_migrations():
    print("Starting manual database migration...")
    
    with database.engine.connect() as conn:
        # Add new columns to users table
        print("Migrating users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT;"))
            print(" - Added bio")
        except Exception as e: print(f" - bio already exists or error: {e}")
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN github_url VARCHAR;"))
            print(" - Added github_url")
        except Exception as e: print(f" - github_url already exists or error: {e}")
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN skills JSON;"))
            print(" - Added skills")
        except Exception as e: print(f" - skills already exists or error: {e}")
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR;"))
            print(" - Added avatar_url")
        except Exception as e: print(f" - avatar_url already exists or error: {e}")

        # Add new columns to hackathons table
        print("Migrating hackathons table...")
        try:
            conn.execute(text("ALTER TABLE hackathons ADD COLUMN prize_pool VARCHAR;"))
            print(" - Added prize_pool")
        except Exception as e: print(f" - prize_pool already exists or error: {e}")
            
        try:
            conn.execute(text("ALTER TABLE hackathons ADD COLUMN max_teams INTEGER;"))
            print(" - Added max_teams")
        except Exception as e: print(f" - max_teams already exists or error: {e}")

        conn.commit()
    
    print("Migration complete!")

if __name__ == "__main__":
    run_migrations()
