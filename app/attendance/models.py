from datetime import datetime
from enum import Enum
from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base  # Connect to Member 3's database module.

class SessionStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    CANCELLED = "cancelled"

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.id"), index=True)
    status: Mapped[SessionStatus] = mapped_column(SqlEnum(SessionStatus), default=SessionStatus.ACTIVE)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class QRToken(Base):
    __tablename__ = "attendance_qr_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("session_id", "student_id", name="uq_attendance_one_student_per_session"), Index("ix_attendance_student_marked", "student_id", "marked_at"))
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    marked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    method: Mapped[str] = mapped_column(String(20), default="qr")
