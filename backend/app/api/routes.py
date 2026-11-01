from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["SIH API"])


@router.get("/health")
def health_check():
    return {
        "status": "success",
        "message": "SIH backend is running"
    }


@router.get("/dashboard")
def get_dashboard():
    return {
        "project": "SIH-PS26262",
        "status": "Active",
        "message": "Welcome to the SIH dashboard"
    }


@router.post("/submit")
def submit_data(data: dict):
    return {
        "status": "success",
        "message": "Data received successfully",
        "received_data": data
    }