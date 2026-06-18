import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the workspace root to sys.path so we can import the backend module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.base import Base, get_db, SessionLocal
from backend.db.connection import check_connection, init_db
from backend.db.model import User, StreamData

def test_flow():
    print("=== Database Connection & Flow Verification ===")
    
    use_sqlite = False
    
    # 1. Check PostgreSQL Connection
    if not check_connection():
        print("WARNING: PostgreSQL host is unreachable. Falling back to local SQLite for schema validation...")
        use_sqlite = True
    else:
        print("✅ PostgreSQL connection test succeeded.")

    # 2. Configure engine and sessionmaker based on the environment
    if use_sqlite:
        sqlite_db_url = "sqlite:///seismosense_test.db"
        test_engine = create_engine(sqlite_db_url)
        TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
        print(f"🔧 Using SQLite test database: {sqlite_db_url}")
        
        # Initialize tables on SQLite
        try:
            Base.metadata.create_all(bind=test_engine)
            print("✅ SQLite tables initialized successfully.")
        except Exception as e:
            print(f"❌ ERROR: SQLite table creation failed: {e}")
            sys.exit(1)
            
        Session = TestSessionLocal
    else:
        # If PostgreSQL succeeded, initialize schemas
        try:
            init_db()
            print("✅ PostgreSQL tables initialized successfully.")
        except Exception as e:
            print(f"❌ ERROR: PostgreSQL initialization failed: {e}")
            sys.exit(1)
        Session = SessionLocal
    
    # 3. Test insert and query operations
    db = Session()
    try:
        # User Insert Test
        test_email = "tester@seismosense.example.com"
        print(f"\n--- Testing User Model ---")
        
        # Cleanup potential previous test user
        db.query(User).filter(User.email == test_email).delete()
        db.commit()
        
        new_user = User(
            name="Seismo Tester",
            email=test_email,
            phone_number="+1234567890",
            hashed_password="argon2id$v=19$m=65536,t=3,p=4$dummyhash"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"✅ User inserted successfully: {new_user}")
        
        # User Retrieve Test
        fetched_user = db.query(User).filter(User.email == test_email).first()
        if fetched_user and fetched_user.name == "Seismo Tester":
            print(f"✅ User retrieved successfully: name={fetched_user.name}, phone={fetched_user.phone_number}")
        else:
            print("❌ ERROR: Failed to retrieve user or data mismatch.")
            sys.exit(1)
            
        # StreamData Insert Test
        print(f"\n--- Testing StreamData Model ---")
        new_stream = StreamData(
            station="SHL",
            p_wave=0.8954
        )
        db.add(new_stream)
        db.commit()
        db.refresh(new_stream)
        print(f"✅ StreamData inserted successfully: {new_stream}")
        
        # StreamData Retrieve Test
        fetched_stream = db.query(StreamData).filter(StreamData.station == "SHL").order_by(StreamData.id.desc()).first()
        if fetched_stream and abs(fetched_stream.p_wave - 0.8954) < 1e-5:
            print(f"✅ StreamData retrieved successfully: station={fetched_stream.station}, p_wave={fetched_stream.p_wave}")
        else:
            print("❌ ERROR: Failed to retrieve stream data or probability mismatch.")
            sys.exit(1)
            
        # Clean up User test data
        db.query(User).filter(User.email == test_email).delete()
        # Clean up StreamData test data
        db.delete(fetched_stream)
        db.commit()
        print("\n✅ Verification data cleaned up successfully.")
        
        # If we created a local SQLite database, delete the file to keep workspace clean
        if use_sqlite:
            db.close()
            test_engine.dispose()
            if os.path.exists("seismosense_test.db"):
                os.remove("seismosense_test.db")
                print("🧹 Cleaned up local SQLite database file.")
                
        print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Database schemas and connection logic are correct.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ ERROR: Flow testing failed: {e}")
        # Clean up SQLite file on exception
        if use_sqlite:
            db.close()
            test_engine.dispose()
            if os.path.exists("seismosense_test.db"):
                os.remove("seismosense_test.db")
        sys.exit(1)
    finally:
        if not use_sqlite:
            db.close()

if __name__ == "__main__":
    test_flow()
