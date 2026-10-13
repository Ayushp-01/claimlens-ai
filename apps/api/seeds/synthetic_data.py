"""Top-level synthetic data script."""
from app.seeds.synthetic_data import seed_synthetic_data

__all__ = ["seed_synthetic_data"]

if __name__ == "__main__":
    from app.database import SessionLocal, engine, Base
    db = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)
        seed_synthetic_data(db)
    finally:
        db.close()
