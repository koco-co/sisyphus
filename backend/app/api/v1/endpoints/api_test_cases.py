"""
API 测试用例相关的 API 端点
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.db import get_session
from app.api import deps
from app.models.api_test_case import ApiTestCase, ApiTestExecution, ApiTestStepResult
from app.models.project import Project
from app.schemas.api_test_case import (
    ApiTestCaseCreate,
    ApiTestCaseUpdate,
    ApiTestCaseResponse,
    ApiTestCaseListResponse,
    ApiTestExecutionRequest,
    ApiTestExecutionResponse,
    ApiTestExecutionDetail,
    ApiTestStepResultResponse,
    ValidateYamlRequest,
    ValidateYamlResponse,
    ImportFromYamlRequest,
)
from app.models.user import User
from app.services.yaml_generator import YAMLGenerator
from app.services.api_engine_adapter import APIEngineAdapter
from app.services.test_result_processor import TestResultProcessor


router = APIRouter()


# ============================================================================
# 辅助函数
# ============================================================================

async def get_test_case(
    test_case_id: int,
    session: AsyncSession
) -> ApiTestCase:
    """获取测试用例（辅助函数）"""
    test_case = await session.get(ApiTestCase, test_case_id)
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"测试用例不存在: {test_case_id}"
        )
    return test_case


async def verify_project_access(
    project_id: int,
    current_user: User,
    session: AsyncSession
) -> Project:
    """验证项目访问权限（辅助函数）"""
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"项目不存在: {project_id}"
        )
    return project


# ============================================================================
# 测试用例 CRUD
# ============================================================================

@router.post("/projects/{project_id}/api-test-cases", response_model=ApiTestCaseResponse)
async def create_api_test_case(
    project_id: int,
    test_case: ApiTestCaseCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """
    创建 API 测试用例

    - **project_id**: 项目 ID
    - **test_case**: 测试用例数据
    """
    # 验证项目存在
    await verify_project_access(project_id, current_user, session)

    # 生成 YAML 内容
    yaml_generator = YAMLGenerator()
    try:
        yaml_content = yaml_generator.generate_yaml(test_case.config_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"配置格式错误: {str(e)}"
        )

    # 创建测试用例
    db_test_case = ApiTestCase(
        project_id=project_id,
        name=test_case.name,
        description=test_case.description,
        yaml_content=yaml_content,
        config_data=test_case.config_data,
        environment_id=test_case.environment_id,
        tags=test_case.tags,
        enabled=test_case.enabled
    )

    session.add(db_test_case)
    await session.commit()
    await session.refresh(db_test_case)

    return db_test_case


@router.get("/projects/{project_id}/api-test-cases", response_model=ApiTestCaseListResponse)
async def list_api_test_cases(
    project_id: int,
    page: int = 1,
    size: int = 10,
    search: Optional[str] = None,
    tags: Optional[str] = None,
    enabled_only: bool = False,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """
    获取项目的 API 测试用例列表

    - **project_id**: 项目 ID
    - **page**: 页码（从 1 开始）
    - **size**: 每页数量
    - **search**: 搜索关键词（名称或描述）
    - **tags**: 标签过滤（逗号分隔）
    - **enabled_only**: 仅显示启用的用例
    """
    # 验证项目存在
    await verify_project_access(project_id, current_user, session)

    # 构建查询
    query = select(ApiTestCase).where(
        ApiTestCase.project_id == project_id,
        ApiTestCase.is_deleted == False
    )

    # 搜索过滤
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (ApiTestCase.name.like(search_pattern)) |
            (ApiTestCase.description.like(search_pattern))
        )

    # 标签过滤
    if tags:
        tag_list = tags.split(",")
        query = query.where(ApiTestCase.tags.contains(tag_list))

    # 仅显示启用的
    if enabled_only:
        query = query.where(ApiTestCase.enabled == True)

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar()

    # 分页
    query = query.offset((page - 1) * size).limit(size)
    query = query.order_by(ApiTestCase.created_at.desc())

    # 执行查询
    result = await session.execute(query)
    test_cases = result.scalars().all()

    return ApiTestCaseListResponse(
        total=total,
        items=test_cases
    )


@router.get("/api-test-cases/{test_case_id}", response_model=ApiTestCaseResponse)
async def get_api_test_case(
    test_case_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """获取单个 API 测试用例详情"""
    test_case = await get_test_case(test_case_id, session)

    # 验证项目访问权限
    await verify_project_access(test_case.project_id, current_user, session)

    return test_case


@router.put("/api-test-cases/{test_case_id}", response_model=ApiTestCaseResponse)
async def update_api_test_case(
    test_case_id: int,
    test_case_update: ApiTestCaseUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """更新 API 测试用例"""
    test_case = await get_test_case(test_case_id, session)

    # 验证项目访问权限
    await verify_project_access(test_case.project_id, current_user, session)

    # 更新字段
    update_data = test_case_update.model_dump(exclude_unset=True)

    # 如果更新了 config_data，需要重新生成 YAML
    if "config_data" in update_data:
        yaml_generator = YAMLGenerator()
        try:
            # 合并现有配置和更新配置
            config_data = {**test_case.config_data, **update_data["config_data"]}
            yaml_content = yaml_generator.generate_yaml(config_data)
            test_case.yaml_content = yaml_content
            test_case.config_data = config_data
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"配置格式错误: {str(e)}"
            )

    # 更新其他字段
    for field, value in update_data.items():
        if field != "config_data":
            setattr(test_case, field, value)

    test_case.updated_at = datetime.utcnow()

    await session.commit()
    await session.refresh(test_case)

    return test_case


@router.delete("/api-test-cases/{test_case_id}")
async def delete_api_test_case(
    test_case_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """删除 API 测试用例（软删除）"""
    test_case = await get_test_case(test_case_id, session)

    # 验证项目访问权限
    await verify_project_access(test_case.project_id, current_user, session)

    # 软删除
    test_case.is_deleted = True
    await session.commit()

    return {"message": f"测试用例已删除: {test_case.name}"}


# ============================================================================
# 测试执行
# ============================================================================

async def execute_test_case_background(
    test_case_id: int,
    execution_request: ApiTestExecutionRequest,
    session: AsyncSession
):
    """
    后台执行测试用例

    Args:
        test_case_id: 测试用例 ID
        execution_request: 执行请求
        session: 数据库会话
    """
    # 获取测试用例
    test_case = await session.get(ApiTestCase, test_case_id)
    if not test_case:
        return

    # 创建执行记录
    execution = ApiTestExecution(
        test_case_id=test_case_id,
        environment_id=execution_request.environment_id,
        status="running",
        execution_options=execution_request.execution_options,
        started_at=datetime.utcnow()
    )

    session.add(execution)
    await session.commit()
    await session.refresh(execution)

    try:
        # 执行测试
        adapter = APIEngineAdapter()
        result = adapter.execute_test_case(
            test_case.yaml_content,
            verbose=execution_request.verbose
        )

        # 处理结果
        processor = TestResultProcessor()
        await processor.process_result(execution.id, result, session)

    except Exception as e:
        # 错误处理
        execution.status = "error"
        execution.error_message = str(e)
        execution.completed_at = datetime.utcnow()
        await session.commit()


@router.post("/api-test-cases/{test_case_id}/execute", response_model=ApiTestExecutionResponse)
async def execute_api_test_case(
    test_case_id: int,
    execution_request: ApiTestExecutionRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """
    执行 API 测试用例（异步执行）

    - **test_case_id**: 测试用例 ID
    - **execution_request**: 执行配置
    """
    # 获取测试用例
    test_case = await get_test_case(test_case_id, session)

    # 验证项目访问权限
    await verify_project_access(test_case.project_id, current_user, session)

    # 创建执行记录（初始状态为 pending）
    execution = ApiTestExecution(
        test_case_id=test_case_id,
        environment_id=execution_request.environment_id,
        status="pending",
        execution_options=execution_request.execution_options
    )

    session.add(execution)
    await session.commit()
    await session.refresh(execution)

    # 后台执行
    background_tasks.add_task(
        execute_test_case_background,
        test_case_id,
        execution_request,
        session
    )

    return execution


@router.get("/api-test-cases/{test_case_id}/executions", response_model=List[ApiTestExecutionResponse])
async def list_test_executions(
    test_case_id: int,
    limit: int = 10,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """获取测试用例的执行历史"""
    test_case = await get_test_case(test_case_id, session)

    # 验证项目访问权限
    await verify_project_access(test_case.project_id, current_user, session)

    # 查询执行记录
    query = select(ApiTestExecution).where(
        ApiTestExecution.test_case_id == test_case_id
    ).order_by(ApiTestExecution.created_at.desc()).limit(limit)

    result = await session.execute(query)
    executions = result.scalars().all()

    return executions


@router.get("/api-test-executions/{execution_id}", response_model=ApiTestExecutionDetail)
async def get_execution_detail(
    execution_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """获取执行记录详情"""
    execution = await session.get(ApiTestExecution, execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"执行记录不存在: {execution_id}"
        )

    # 验证项目访问权限
    test_case = await session.get(ApiTestCase, execution.test_case_id)
    if test_case:
        await verify_project_access(test_case.project_id, current_user, session)

    return execution


@router.get("/api-test-executions/{execution_id}/steps", response_model=List[ApiTestStepResultResponse])
async def get_execution_step_results(
    execution_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """获取执行的步骤结果"""
    execution = await session.get(ApiTestExecution, execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"执行记录不存在: {execution_id}"
        )

    # 验证项目访问权限
    test_case = await session.get(ApiTestCase, execution.test_case_id)
    if test_case:
        await verify_project_access(test_case.project_id, current_user, session)

    # 查询步骤结果
    query = select(ApiTestStepResult).where(
        ApiTestStepResult.execution_id == execution_id
    ).order_by(ApiTestStepResult.step_order)

    result = await session.execute(query)
    step_results = result.scalars().all()

    return step_results


# ============================================================================
# 其他功能
# ============================================================================

@router.post("/api-test-cases/validate", response_model=ValidateYamlResponse)
async def validate_test_case_yaml(
    request: ValidateYamlRequest,
    current_user: User = Depends(deps.get_current_user)
):
    """验证测试用例 YAML 语法"""
    adapter = APIEngineAdapter()
    is_valid = adapter.validate_yaml(request.yaml_content)

    if is_valid:
        return ValidateYamlResponse(valid=True)
    else:
        return ValidateYamlResponse(
            valid=False,
            errors=["YAML 语法错误或不符合 API Engine 规范"]
        )


@router.post("/projects/{project_id}/api-test-cases/import-yaml", response_model=ApiTestCaseResponse)
async def import_from_yaml(
    project_id: int,
    request: ImportFromYamlRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """从 YAML 导入测试用例"""
    # 验证项目存在
    await verify_project_access(project_id, current_user, session)

    # 验证 YAML
    adapter = APIEngineAdapter()
    if not adapter.validate_yaml(request.yaml_content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YAML 格式错误"
        )

    # 解析 YAML 提取基本信息（简化版）
    import yaml
    try:
        yaml_data = yaml.safe_load(request.yaml_content)
        name = yaml_data.get("name", "导入的测试用例")
        description = yaml_data.get("description", "")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法解析 YAML"
        )

    # 创建测试用例
    db_test_case = ApiTestCase(
        project_id=project_id,
        name=name,
        description=description,
        yaml_content=request.yaml_content,
        config_data=yaml_data,
        enabled=True
    )

    session.add(db_test_case)
    await session.commit()
    await session.refresh(db_test_case)

    return db_test_case
