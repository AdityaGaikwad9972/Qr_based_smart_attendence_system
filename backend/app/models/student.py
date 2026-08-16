from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    usn: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    semester: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    section: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="student_profile",
    )
