from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database.dependencies import get_db  # Change only if the shared project locates this elsewhere.
from app.models.user import User
from app.routers.auth import get_current_principal, UserPrincipal
from . import integrations
from .models import AttendanceRecord, AttendanceSession, QRToken, SessionStatus

router = APIRouter(prefix="/attendance", tags=["attendance"])
QR_LIFETIME = timedelta(seconds=10)



def require_role(*roles: str):
    def guard(user: User = Depends(get_current_user)):
        if user.role.value not in roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )
        return user

    return guard

class StartSession(BaseModel): course_id: int = Field(gt=0)
class TokenRequest(BaseModel): token: str = Field(min_length=20, max_length=200)
class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; session_id: int; student_id: int; marked_at: datetime; method: str
class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; course_id: int; faculty_id: int; status: SessionStatus; started_at: datetime; ended_at: datetime | None

def now() -> datetime: return datetime.now(timezone.utc)
def token_hash(token: str) -> str: return sha256(token.encode()).hexdigest()
def active_session(db: Session, session_id: int) -> AttendanceSession:
    item = db.get(AttendanceSession, session_id)
    if not item or item.status != SessionStatus.ACTIVE: raise HTTPException(404, "Active attendance session not found")
    return item
def valid_token_session(db: Session, raw: str) -> tuple[AttendanceSession, QRToken]:
    item = db.scalar(select(QRToken).where(QRToken.token_hash == token_hash(raw)))
    if not item or item.revoked_at or item.expires_at <= now(): raise HTTPException(400, "QR token is invalid or expired")
    return active_session(db, item.session_id), item

@router.post("/sessions", response_model=SessionOut, status_code=201)
def start_session(payload: StartSession, db: Session = Depends(get_db), user: User = Depends(require_role("faculty"))):
    faculty_id = integrations.faculty_id_for_user(db, user.user_id)
    if not faculty_id or not integrations.faculty_owns_course(db, faculty_id, payload.course_id): raise HTTPException(403, "You are not assigned to this course")
    item = AttendanceSession(course_id=payload.course_id, faculty_id=faculty_id, status=SessionStatus.ACTIVE)
    db.add(item); db.commit(); db.refresh(item); return item

@router.post("/sessions/{session_id}/qr-token")
def issue_qr(session_id: int, db: Session = Depends(get_db), user: UserPrincipal   = Depends(require_role("faculty"))):
    session = active_session(db, session_id)
    if integrations.faculty_id_for_user(db, user.user_id) != session.faculty_id: raise HTTPException(403, "This is not your session")
    raw, expires_at = token_urlsafe(32), now() + QR_LIFETIME
    db.add(QRToken(session_id=session.id, token_hash=token_hash(raw), expires_at=expires_at)); db.commit()
    return {"token": raw, "expires_at": expires_at}

@router.post("/qr/validate")
def validate_qr(payload: TokenRequest, db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    session, qr = valid_token_session(db, payload.token)
    if not integrations.student_and_enrollment_for_user(db, user.user_id, session.course_id): raise HTTPException(403, "You are not enrolled in this course")
    return {"valid": True, "session_id": session.id, "course_id": session.course_id, "expires_at": qr.expires_at}

@router.post("/mark", response_model=RecordOut, status_code=201)
def mark_attendance(payload: TokenRequest, db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    session, _ = valid_token_session(db, payload.token)
    student_id = integrations.student_and_enrollment_for_user(db, user.user_id, session.course_id)
    if not student_id: raise HTTPException(403, "You are not enrolled in this course")
    record = AttendanceRecord(session_id=session.id, student_id=student_id, method="qr"); db.add(record)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Attendance already marked for this session")
    db.refresh(record); return record

@router.post("/sessions/{session_id}/end", response_model=SessionOut)
def end_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("faculty"))):
    session = active_session(db, session_id)
    if integrations.faculty_id_for_user(db, user.user_id) != session.faculty_id: raise HTTPException(403, "This is not your session")
    session.status, session.ended_at = SessionStatus.ENDED, now()
    db.query(QRToken).filter(QRToken.session_id == session.id, QRToken.revoked_at.is_(None)).update({QRToken.revoked_at: now()}, synchronize_session=False)
    db.commit(); db.refresh(session); return session

@router.get("/sessions/{session_id}/live")
def live_attendance(session_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("faculty"))):
    session = db.get(AttendanceSession, session_id)
    if not session or integrations.faculty_id_for_user(db, user.user_id) != session.faculty_id: raise HTTPException(404, "Attendance session not found")
    records = list(db.scalars(select(AttendanceRecord).where(AttendanceRecord.session_id == session_id).order_by(AttendanceRecord.marked_at)))
    return {"session": SessionOut.model_validate(session), "present_count": len(records), "records": [RecordOut.model_validate(r) for r in records]}

@router.get("/me/history", response_model=list[RecordOut])
def my_history(db: Session = Depends(get_db),   user: User  = Depends(require_role("student"))):
    student_id = integrations.student_id_for_user(db, user.user_id)
    if not student_id: raise HTTPException(404, "Student profile not found")
    return list(db.scalars(select(AttendanceRecord).where(AttendanceRecord.student_id == student_id).order_by(AttendanceRecord.marked_at.desc())))

@router.get("/courses/{course_id}/history", response_model=list[RecordOut])
def course_history(course_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("faculty"))):
    faculty_id = integrations.faculty_id_for_user(db, user.user_id)
    if not faculty_id or not integrations.faculty_owns_course(db, faculty_id, course_id): raise HTTPException(403, "You are not assigned to this course")
    return list(db.scalars(select(AttendanceRecord).join(AttendanceSession).where(AttendanceSession.course_id == course_id).order_by(AttendanceRecord.marked_at.desc())))
