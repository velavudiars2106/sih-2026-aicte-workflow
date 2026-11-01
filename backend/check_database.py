import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent / "workflow.db"

print("Database path:", DATABASE_PATH)
print("Database exists:", DATABASE_PATH.exists())

if DATABASE_PATH.exists():
    connection = sqlite3.connect(str(DATABASE_PATH))

    try:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()

        print("\nTables found:")
        for table in tables:
            print("-", table[0])

        print("\nApplications table columns:")

        columns = connection.execute(
            "PRAGMA table_info(applications)"
        ).fetchall()

        for column in columns:
            print(f"- {column[1]} ({column[2]})")

    finally:
        connection.close()
else:
    print("Database file was not found.")