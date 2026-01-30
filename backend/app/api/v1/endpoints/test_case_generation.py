"""
测试用例生成API - 功能测试模块
提供AI生成测试用例的接口
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.models.functional_test_case import FunctionalTestCase
from app.schemas.test_case_generation import (
    TestCaseGenerate,
    TestCaseGenerationResult,
    GeneratedTestCase
)
from app.services.test_case_generation_service import TestCaseGenerationService
from sqlmodel import select

router = APIRouter(tags=["测试用例生成"])


@router.post("/generate", response_model=TestCaseGenerationResult)
async def generate_test_cases(
    data: TestCaseGenerate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    AI生成测试用例

    基于测试点自动生成详细的测试用例，包括步骤和预期结果

    - **requirement_id**: 需求ID
    - **test_point_ids**: 测试点ID列表
    - **module_name**: 模块名称
    - **page_name**: 页面名称
    - **case_type**: 用例类型
    - **include_knowledge**: 是否使用知识库

    返回生成的测试用例列表
    """
    try:
        # 创建生成服务
        service = TestCaseGenerationService(session, current_user.id)

        # 生成测试用例
        result = await service.generate_test_cases(data)

        return TestCaseGenerationResult(
            success=True,
            message=f"成功生成{result.total_count}个测试用例",
            data=result
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成测试用例失败: {str(e)}"
        )


@router.get("/requirement/{requirement_id}", response_model=List[GeneratedTestCase])
async def get_test_cases_by_requirement(
    requirement_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取指定需求的所有测试用例

    返回该需求关联的所有测试用例
    """
    result = await session.execute(
        select(FunctionalTestCase)
        .where(FunctionalTestCase.requirement_id == requirement_id)
        .order_by(FunctionalTestCase.priority, FunctionalTestCase.id)
    )
    test_cases = result.scalars().all()

    return [
        GeneratedTestCase(
            module_name=case.module_name,
            page_name=case.page_name,
            title=case.title,
            priority=case.priority,
            case_type=case.case_type,
            preconditions=case.preconditions or [],
            steps=[
                {
                    "step_number": step["step_number"],
                    "action": step["action"],
                    "expected_result": step["expected_result"]
                }
                for step in case.steps
            ],
            tags=case.tags or [],
            estimated_time=case.estimated_time,
            complexity=case.complexity
        )
        for case in test_cases
    ]


@router.get("/{case_id}")
async def get_test_case(
    case_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取指定测试用例的详情

    返回用例的完整信息，包括所有步骤
    """
    result = await session.execute(
        select(FunctionalTestCase)
        .where(FunctionalTestCase.case_id == case_id)
    )
    test_case = result.scalar_one_or_none()

    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )

    return {
        "id": test_case.id,
        "case_id": test_case.case_id,
        "requirement_id": test_case.requirement_id,
        "module_name": test_case.module_name,
        "page_name": test_case.page_name,
        "title": test_case.title,
        "priority": test_case.priority,
        "case_type": test_case.case_type,
        "preconditions": test_case.preconditions or [],
        "steps": test_case.steps,
        "tags": test_case.tags or [],
        "estimated_time": test_case.estimated_time,
        "complexity": test_case.complexity,
        "is_ai_generated": test_case.is_ai_generated,
        "status": test_case.status,
        "created_at": test_case.created_at,
        "updated_at": test_case.updated_at,
    }


@router.delete("/{case_id}")
async def delete_test_case(
    case_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    删除测试用例

    删除指定的测试用例
    """
    result = await session.execute(
        select(FunctionalTestCase)
        .where(FunctionalTestCase.case_id == case_id)
    )
    test_case = result.scalar_one_or_none()

    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )

    await session.delete(test_case)
    await session.commit()

    return {"message": "测试用例已删除", "case_id": case_id}


@router.put("/{case_id}/approve")
async def approve_test_case(
    case_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    审核通过测试用例

    将测试用例状态从draft改为approved
    """
    result = await session.execute(
        select(FunctionalTestCase)
        .where(FunctionalTestCase.case_id == case_id)
    )
    test_case = result.scalar_one_or_none()

    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )

    # 更新状态
    test_case.status = "approved"
    await session.commit()
    await session.refresh(test_case)

    return {
        "message": "测试用例已审核通过",
        "case_id": case_id,
        "status": test_case.status
    }
