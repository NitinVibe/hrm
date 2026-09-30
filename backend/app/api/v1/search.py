from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from typing import Any

from app.core.auth_dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.department import Department
from app.models.designation import Designation
from app.models.branch import Branch
from app.models.leave import Leave
from app.models.document import Document
from app.models.announcement import Announcement
from app.models.recruitment import Candidate

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get("")
def global_search(
    q: str = Query(..., min_length=1, description="Search term"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query_term = f"%{q.strip()}%"
    org_id = current_user.organization_id
    results: dict[str, list[dict[str, Any]]] = {
        "employees": [],
        "departments": [],
        "designations": [],
        "branches": [],
        "documents": [],
        "announcements": [],
        "candidates": [],
        "leaves": [],
    }

    # 1. Employees
    emps = db.scalars(
        select(Employee).where(
            Employee.organization_id == org_id,
            or_(
                Employee.first_name.ilike(query_term),
                Employee.last_name.ilike(query_term),
                Employee.email.ilike(query_term),
                Employee.employee_code.ilike(query_term),
                Employee.phone.ilike(query_term),
            )
        ).limit(6)
    ).all()
    for e in emps:
        results["employees"].append({
            "id": str(e.id),
            "title": f"{e.first_name} {e.last_name or ''}".strip(),
            "subtitle": f"{e.employee_code} · {e.email or 'No email'}",
            "status": e.employment_status,
            "page": "Employees",
        })

    # 2. Departments
    depts = db.scalars(
        select(Department).where(
            Department.organization_id == org_id,
            or_(
                Department.name.ilike(query_term),
                Department.description.ilike(query_term),
            )
        ).limit(5)
    ).all()
    for d in depts:
        results["departments"].append({
            "id": str(d.id),
            "title": d.name,
            "subtitle": d.description or "Department",
            "page": "Departments",
        })

    # 3. Designations
    desigs = db.scalars(
        select(Designation).where(
            Designation.organization_id == org_id,
            or_(
                Designation.name.ilike(query_term),
                Designation.description.ilike(query_term),
            )
        ).limit(5)
    ).all()
    for ds in desigs:
        results["designations"].append({
            "id": str(ds.id),
            "title": ds.name,
            "subtitle": ds.description or "Designation",
            "page": "Designations",
        })

    # 4. Branches
    branches = db.scalars(
        select(Branch).where(
            Branch.organization_id == org_id,
            or_(
                Branch.name.ilike(query_term),
                Branch.code.ilike(query_term),
                Branch.city.ilike(query_term),
            )
        ).limit(5)
    ).all()
    for b in branches:
        results["branches"].append({
            "id": str(b.id),
            "title": b.name,
            "subtitle": f"{b.code} · {b.city or b.country}",
            "page": "Branches",
        })

    # 5. Documents
    docs = db.scalars(
        select(Document).where(
            Document.organization_id == org_id,
            or_(
                Document.title.ilike(query_term),
                Document.category.ilike(query_term),
            )
        ).limit(5)
    ).all()
    for doc in docs:
        results["documents"].append({
            "id": str(doc.id),
            "title": doc.title,
            "subtitle": f"Category: {doc.category}",
            "page": "Documents",
        })

    # 6. Announcements
    announcements = db.scalars(
        select(Announcement).where(
            Announcement.organization_id == org_id,
            or_(
                Announcement.title.ilike(query_term),
                Announcement.content.ilike(query_term),
            )
        ).limit(5)
    ).all()
    for a in announcements:
        results["announcements"].append({
            "id": str(a.id),
            "title": a.title,
            "subtitle": f"Priority: {a.priority}",
            "page": "Announcements",
        })

    # 7. Candidates
    candidates = db.scalars(
        select(Candidate).where(
            Candidate.organization_id == org_id,
            or_(
                Candidate.first_name.ilike(query_term),
                Candidate.last_name.ilike(query_term),
                Candidate.email.ilike(query_term),
            )
        ).limit(5)
    ).all()
    for c in candidates:
        results["candidates"].append({
            "id": str(c.id),
            "title": f"{c.first_name} {c.last_name}",
            "subtitle": f"Candidate · {c.email} · Status: {c.status}",
            "page": "Recruitment",
        })

    # Total counts
    total_found = sum(len(v) for v in results.values())
    return {
        "query": q,
        "total_results": total_found,
        "results": results,
    }
