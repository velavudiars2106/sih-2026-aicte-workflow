from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    Text,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


def current_utc_time():
    return datetime.now(timezone.utc)


# --------------------------------------------------
# USER MODEL
# --------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(200), nullable=False)

    email = Column(String(200), unique=True, nullable=False, index=True)

    hashed_password = Column(String(255), nullable=False)

    role = Column(String(50), nullable=False, index=True)
    # Allowed roles: institution, official

    institution_name = Column(String(200), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        nullable=False,
    )

    applications = relationship(
        "Application",
        back_populates="owner",
    )


# --------------------------------------------------
# APPLICATION MODEL
# --------------------------------------------------

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    # Links an application to its institution account.
    # Nullable to preserve existing application records.
    owner_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    institution_name = Column(String(200), nullable=False)

    institution_email = Column(String(200), nullable=False)

    application_type = Column(String(100), nullable=False)

    title = Column(String(250), nullable=False)

    description = Column(Text, nullable=False)

    status = Column(
        String(50),
        nullable=False,
        default="Submitted",
        index=True,
    )

    compliance_status = Column(
        String(50),
        nullable=False,
        default="Pending",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        onupdate=current_utc_time,
        nullable=False,
    )

    owner = relationship(
        "User",
        back_populates="applications",
    )