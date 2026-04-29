"""
User follow relationship — directional: follower → following.
"""
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserFollow(Base):
    """follower_id follows following_id."""
    __tablename__ = "user_follows"
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
        # A user cannot follow themselves
        CheckConstraint("follower_id <> following_id", name="ck_follow_not_self"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    following_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    follower: Mapped["User"] = relationship(  # noqa: F821
        foreign_keys=[follower_id],
        back_populates="following_links",
        lazy="noload",
    )
    following: Mapped["User"] = relationship(  # noqa: F821
        foreign_keys=[following_id],
        back_populates="follower_links",
        lazy="noload",
    )
