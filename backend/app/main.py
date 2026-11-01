from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app import model

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_official,
    require_institution,
)


# ============================================================
# PROJECT CONFIGURATION
# ============================================================

PROJECT_TITLE = (
    "Integrated AICTE Approval Workflow Automation, "
    "Compliance Monitoring and Alert Management System"
)


# ============================================================
# DATABASE INITIALIZATION AND MIGRATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    # Create new tables, including users.
    Base.metadata.create_all(bind=engine)

    # Safely add owner_user_id to an existing applications table.
    inspector = inspect(engine)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("applications")
    }

    if "owner_user_id" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE applications "
                    "ADD COLUMN owner_user_id INTEGER "
                    "REFERENCES users(id)"
                )
            )

    yield


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=PROJECT_TITLE,
    description=(
        "An integrated platform for AICTE approval workflow "
        "automation, institutional compliance monitoring, "
        "and alert management."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST AND RESPONSE SCHEMAS
# ============================================================

class InstitutionRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=12)
    institution_name: str = Field(min_length=2, max_length=200)


class AdminInstitutionCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=12)
    institution_name: str = Field(min_length=2, max_length=200)


class ApplicationCreate(BaseModel):
    application_type: str = Field(min_length=2, max_length=100)
    title: str = Field(min_length=3, max_length=250)
    description: str = Field(min_length=5)


class ApplicationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=250)
    description: str | None = Field(default=None, min_length=5)
    status: str | None = Field(default=None, min_length=2, max_length=50)
    compliance_status: str | None = Field(
        default=None,
        min_length=2,
        max_length=50,
    )


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_user_id: int | None = None
    institution_name: str
    institution_email: str
    application_type: str
    title: str
    description: str
    status: str
    compliance_status: str
    created_at: datetime
    updated_at: datetime


# ============================================================
# HELPER: USER RESPONSE
# ============================================================

def user_information(user):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "institution_name": user.institution_name,
        "is_verified": user.is_verified,
        "is_active": user.is_active,
    }


# ============================================================
# HOME ENDPOINT
# ============================================================

@app.get("/")
def home():
    return {
        "project": PROJECT_TITLE,
        "message": "AICTE workflow backend is running",
        "status": "success",
        "documentation": "/docs",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "backend": "connected",
            "database": "connected",
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed.",
        ) from exc


# ============================================================
# PROJECT INFORMATION
# ============================================================

@app.get("/api/project")
def get_project_information():
    return {
        "project_title": PROJECT_TITLE,
        "problem_statement": "SIH 2026 PS26262",
        "modules": [
            "Approval Workflow Automation",
            "Compliance Monitoring",
            "Alert Management",
        ],
        "database": "SQLite",
        "database_file": "backend/workflow.db",
    }


# ============================================================
# INSTITUTION REGISTRATION
# ============================================================

@app.post("/api/auth/register", status_code=201)
def register_institution(
    data: InstitutionRegister,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()

    existing_user = db.query(model.User).filter(
        model.User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = model.User(
        full_name=data.full_name,
        email=email,
        hashed_password=hash_password(data.password),
        role="institution",
        institution_name=data.institution_name,
        is_active=True,
        is_verified=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": (
            "Registration successful. Your account is awaiting "
            "AICTE official verification."
        ),
        "user": user_information(user),
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.lower()

    user = db.query(model.User).filter(
        model.User.email == email
    ).first()

    if not user or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account has been deactivated.",
        )

    if user.role == "institution" and not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Your institution account is awaiting AICTE verification.",
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user": user_information(user),
    }


# ============================================================
# CURRENT LOGGED-IN USER
# ============================================================

@app.get("/api/auth/me")
def get_me(
    current_user=Depends(get_current_user),
):
    return user_information(current_user)


# ============================================================
# OFFICIAL CREATES INSTITUTION ACCOUNT
# ============================================================

@app.post("/api/official/institutions", status_code=201)
def create_institution_account(
    data: AdminInstitutionCreate,
    db: Session = Depends(get_db),
    official=Depends(require_official),
):
    email = str(data.email).lower()

    if db.query(model.User).filter(
        model.User.email == email
    ).first():
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = model.User(
        full_name=data.full_name,
        email=email,
        hashed_password=hash_password(data.password),
        role="institution",
        institution_name=data.institution_name,
        is_active=True,
        is_verified=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Verified institution account created.",
        "user": user_information(user),
    }


# ============================================================
# LIST PENDING INSTITUTION ACCOUNTS
# ============================================================

@app.get("/api/official/institutions/pending")
def list_pending_institutions(
    db: Session = Depends(get_db),
    official=Depends(require_official),
):
    users = db.query(model.User).filter(
        model.User.role == "institution",
        model.User.is_verified == False,
    ).all()

    return [user_information(user) for user in users]


# ============================================================
# VERIFY INSTITUTION ACCOUNT
# ============================================================

@app.patch("/api/official/institutions/{user_id}/verify")
def verify_institution(
    user_id: int,
    db: Session = Depends(get_db),
    official=Depends(require_official),
):
    user = db.query(model.User).filter(
        model.User.id == user_id,
        model.User.role == "institution",
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Institution account not found.",
        )

    user.is_verified = True
    db.commit()
    db.refresh(user)

    return {
        "message": "Institution account verified successfully.",
        "user": user_information(user),
    }


# ============================================================
# CREATE APPLICATION — INSTITUTION ONLY
# ============================================================

@app.post(
    "/api/applications",
    response_model=ApplicationResponse,
    status_code=201,
)
def create_application(
    application_data: ApplicationCreate,
    db: Session = Depends(get_db),
    institution=Depends(require_institution),
):
    application = model.Application(
        owner_user_id=institution.id,
        institution_name=institution.institution_name,
        institution_email=institution.email,
        application_type=application_data.application_type,
        title=application_data.title,
        description=application_data.description,
        status="Submitted",
        compliance_status="Pending",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


# ============================================================
# LIST APPLICATIONS
# ============================================================

@app.get(
    "/api/applications",
    response_model=list[ApplicationResponse],
)
def list_applications(
    status_filter: str | None = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(model.Application)

    if current_user.role == "institution":
        query = query.filter(
            model.Application.owner_user_id == current_user.id
        )

    if status_filter:
        query = query.filter(
            model.Application.status == status_filter
        )

    return (
        query.order_by(model.Application.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# GET APPLICATION BY ID
# ============================================================

@app.get(
    "/api/applications/{application_id}",
    response_model=ApplicationResponse,
)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    application = db.query(model.Application).filter(
        model.Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    if (
        current_user.role == "institution"
        and application.owner_user_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot access another institution's application.",
        )

    return application


# ============================================================
# UPDATE APPLICATION
# ============================================================

@app.patch(
    "/api/applications/{application_id}",
    response_model=ApplicationResponse,
)
def update_application(
    application_id: int,
    updates: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    application = db.query(model.Application).filter(
        model.Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    update_data = updates.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update.",
        )

    # Institution permissions.
    if current_user.role == "institution":

        if application.owner_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You cannot modify another institution's application.",
            )

        if application.status != "Returned for Correction":
            raise HTTPException(
                status_code=403,
                detail="Applications can only be edited when returned for correction.",
            )

        if not set(update_data).issubset({"title", "description"}):
            raise HTTPException(
                status_code=403,
                detail="Institutions cannot change approval or compliance status.",
            )

        application.status = "Submitted"

    # Official permissions.
    elif current_user.role == "official":

        allowed_statuses = {
            "Submitted",
            "Under Review",
            "Approved",
            "Rejected",
            "Returned for Correction",
        }

        allowed_compliance_statuses = {
            "Pending",
            "Compliant",
            "Non-Compliant",
            "Under Review",
        }

        if (
            "status" in update_data
            and update_data["status"] not in allowed_statuses
        ):
            raise HTTPException(
                status_code=422,
                detail="Invalid application status.",
            )

        if (
            "compliance_status" in update_data
            and update_data["compliance_status"]
            not in allowed_compliance_statuses
        ):
            raise HTTPException(
                status_code=422,
                detail="Invalid compliance status.",
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized role.",
        )

    for field, value in update_data.items():
        setattr(application, field, value)

    application.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(application)

    return application


# ============================================================
# DELETE APPLICATION — OFFICIAL ONLY
# ============================================================

@app.delete("/api/applications/{application_id}")
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    official=Depends(require_official),
):
    application = db.query(model.Application).filter(
        model.Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    db.delete(application)
    db.commit()

    return {
        "status": "success",
        "message": "Application deleted successfully.",
        "application_id": application_id,
    }


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/api/dashboard/statistics")
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(model.Application)

    if current_user.role == "institution":
        query = query.filter(
            model.Application.owner_user_id == current_user.id
        )

    applications = query.all()

    return {
        "project_title": PROJECT_TITLE,
        "total_applications": len(applications),
        "submitted": sum(
            a.status == "Submitted" for a in applications
        ),
        "under_review": sum(
            a.status == "Under Review" for a in applications
        ),
        "approved": sum(
            a.status == "Approved" for a in applications
        ),
        "rejected": sum(
            a.status == "Rejected" for a in applications
        ),
        "pending_compliance": sum(
            a.compliance_status == "Pending" for a in applications
        ),
        "non_compliant": sum(
            a.compliance_status == "Non-Compliant"
            for a in applications
        ),
    }