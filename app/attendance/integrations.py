"""Connect these functions to Member 3's Student, Faculty, Course and Enrollment models."""
from sqlalchemy.orm import Session

def faculty_id_for_user(db: Session, user_id: int) -> int | None:
    raise NotImplementedError

def student_id_for_user(db: Session, user_id: int) -> int | None:
    raise NotImplementedError

def student_and_enrollment_for_user(db: Session, user_id: int, course_id: int) -> int | None:
    raise NotImplementedError

def faculty_owns_course(db: Session, faculty_id: int, course_id: int) -> bool:
    raise NotImplementedError
