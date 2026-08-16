from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.faculty import Faculty
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest
from app.core.security import hash_password


def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:
    statement = select(User).where(User.email == email.lower())
    return db.scalar(statement)


def create_user(
    db: Session,
    data: RegisterRequest,
) -> User:
    user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=data.role.value,
        is_active=True,
    )

    db.add(user)
    db.flush()

    if data.role == UserRole.STUDENT:
        if not all([
            data.usn,
            data.department,
            data.semester,
            data.section,
        ]):
            raise ValueError(
                "USN, department, semester and section are required for students"
            )

        student = Student(
            user_id=user.id,
            usn=data.usn,
            department=data.department,
            semester=data.semester,
            section=data.section,
        )

        db.add(student)

    elif data.role == UserRole.FACULTY:
        if not all([
            data.employee_id,
            data.department,
        ]):
            raise ValueError(
                "Employee ID and department are required for faculty"
            )

        faculty = Faculty(
            user_id=user.id,
            employee_id=data.employee_id,
            department=data.department,
        )

        db.add(faculty)

    db.commit()
    db.refresh(user)

    return user
