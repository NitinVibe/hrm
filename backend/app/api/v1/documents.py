import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, require_employee
from app.db.dependencies import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentVerify, DocumentResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/documents", tags=["Documents Management"])

@router.get("", response_model=list[DocumentResponse])
def list_documents(
    category: str | None = None,
    employee_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Document).where(Document.organization_id == current_user.organization_id)
    if category:
        query = query.where(Document.category == category)
    if employee_id:
        query = query.where(Document.employee_id == employee_id)
    return db.scalars(query.order_by(Document.uploaded_at.desc())).all()

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = Document(
        organization_id=current_user.organization_id,
        employee_id=data.employee_id,
        uploaded_by_id=current_user.id,
        title=data.title.strip(),
        category=data.category,
        file_url=data.file_url,
        file_size_kb=data.file_size_kb,
        expiry_date=data.expiry_date,
        verification_status="pending",
    )
    db.add(doc)
    db.flush()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPLOAD_DOCUMENT",
        entity_type="document",
        entity_id=str(doc.id),
        details={"title": doc.title, "category": doc.category},
    )

    db.commit()
    db.refresh(doc)
    return doc

@router.patch("/{document_id}/verify", response_model=DocumentResponse)
def verify_document(
    document_id: uuid.UUID,
    data: DocumentVerify,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    doc = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    doc.verification_status = data.verification_status
    doc.updated_at = datetime.utcnow()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="VERIFY_DOCUMENT",
        entity_type="document",
        entity_id=str(doc.id),
        details={"status": data.verification_status},
    )

    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    doc = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    db.delete(doc)
    db.commit()
    return None
