from fastapi import FastAPI

app = FastAPI(
    title="SIH 2026 PS26262",
    description="AI-assisted workflow approval system",
    version="1.0.0",
)


@app.get("/")
def home():
    return {
        "message": "SIH 2026 backend is running",
        "status": "success",
    }