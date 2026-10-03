import os
import sys
import traceback

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from app.core.config import Settings

def main():
    try:
        settings = Settings()
        print('Database URL:', settings.database_url)
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        conn = engine.connect()
        print('Connection successful')
        conn.close()
    except Exception as e:
        print('Error connecting to DB:')
        traceback.print_exc()

if __name__ == '__main__':
    main()
