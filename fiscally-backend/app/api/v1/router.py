from fastapi import APIRouter
from app.api.v1.endpoints import health, profile, subzero, dopamine_audit, thesis_flow

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(subzero.router, prefix="/subzero", tags=["SubZero"])
api_router.include_router(dopamine_audit.router, prefix="/dopamine-audit", tags=["DopamineAudit"])
api_router.include_router(thesis_flow.router, prefix="/thesis-flow", tags=["ThesisFlow"])
