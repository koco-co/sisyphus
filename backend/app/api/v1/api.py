from fastapi import APIRouter, Depends
from app.api.v1.endpoints import (
    projects, interfaces, testcases, scenarios, engine, auth,
    dashboard, reports, plans, keywords, swagger, upload, curl_parser,
    settings, functional, documents, execution, api_test_cases, ai_config, ai_clarification, test_point_generation, test_case_generation
)
from app.api import deps

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(interfaces.router, prefix="/interfaces", tags=["interfaces"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(swagger.router, prefix="/interfaces", tags=["swagger"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(curl_parser.router, prefix="/interfaces", tags=["curl"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(upload.router, prefix="/files", tags=["files"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(testcases.router, prefix="/testcases", tags=["testcases"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(engine.router, prefix="/engine", tags=["engine"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(keywords.router, prefix="/keywords", tags=["keywords"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(functional.router, prefix="/functional", tags=["functional"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(execution.router, prefix="/execution", tags=["execution"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(api_test_cases.router, tags=["api-test-cases"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(ai_config.router, prefix="/ai/configs", tags=["AI配置管理"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(ai_clarification.router, prefix="/ai", tags=["AI需求澄清"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(test_point_generation.router, prefix="/test-points", tags=["测试点生成"], dependencies=[Depends(deps.get_current_user)])
api_router.include_router(test_case_generation.router, prefix="/test-cases/generate", tags=["测试用例生成"], dependencies=[Depends(deps.get_current_user)])

