from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ApplicationCreate(BaseModel):
    institution_name: str = Field(
        min_length=2,
        max_length=200,
    )

    institution_email: EmailStr

    application_type: str = Field(
        min_length=2,
        max_length=100,
    )

    title: str = Field(
        min_length=3,
        max_length=250,
    )

    description: str = Field(
        min_length=5,
    )


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    institution_name: str

    institution_email: str

    application_type: str

    title: str

    description: str

    status: str

    compliance_status: str

    created_at: datetime

    updated_at: datetime