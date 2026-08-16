"""The only connection points to the authentication/database team's models."""
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.course import Course, Enrollment
from app.models.faculty import Faculty
from app.models.student import Student

def faculty_id_for_user(db: Session, user_id: int) -> int | None:
    """Return Faculty.id for User.id, or None."""
    return db.scalar(select(Faculty.id).where(Faculty.user_id == user_id))

def student_id_for_user(db: Session, user_id: int) -> int | None:
    """Return Student.id for User.id, or None."""
    return db.scalar(select(Student.id).where(Student.user_id == user_id))

def student_and_enrollment_for_user(db: Session, user_id: int, course_id: int) -> int | None:
    """Return Student.id only if the student is enrolled in course_id."""
    return db.scalar(select(Student.id).join(Enrollment).where(Student.user_id == user_id, Enrollment.course_id == course_id))

def faculty_owns_course(db: Session, faculty_id: int, course_id: int) -> bool:
    """Return whether the faculty member is assigned to the course."""
    return db.scalar(select(Course.id).where(Course.id == course_id, Course.faculty_id == faculty_id)) is not None
