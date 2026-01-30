"""
测试点生成API - 功能测试模块
提供AI生成测试点的接口
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.models.functional_test_point import TestPoint
from app.schemas.test_point_generation import (
    TestPointGenerate,
    TestPointGenerationResult,
    TestPointBase
)
from app.services.test_point_generation_service import TestPointGenerationService
from sqlmodel import select

router = APIRouter(tags=["测试点生成"])


@router.post("/generate", response_model=TestPointGenerationResult)
async def generate_test_points(
    data: TestPointGenerate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    AI生成测试点

    基于需求文档自动生成测试点，支持多种测试类型

    - **requirement_id**: 需求ID
    - **requirement_text**: 需求文档内容（Markdown格式）
    - **categories**: 要生成的测试点分类
    - **include_knowledge**: 是否使用历史用例知识库

    返回生成的测试点列表
    """
    try:
        # 创建生成服务
        service = TestPointGenerationService(session, current_user.id)

        # 生成测试点
        result = await service.generate_test_points(data)

        return TestPointGenerationResult(
            success=True,
            message=f"成功生成{result.total_count}个测试点",
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
            detail=f"生成测试点失败: {str(e)}"
        )


@router.get("/requirement/{requirement_id}", response_model=List[TestPointBase])
async def get_test_points_by_requirement(
    requirement_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取指定需求的所有测试点

    返回该需求关联的所有测试点
    """
    result = await session.execute(
        select(TestPoint)
        .where(TestPoint.requirement_id == requirement_id)
        .order_by(TestPoint.priority, TestPoint.id)
    )
    test_points = result.scalars().all()

    return [
        TestPointBase(
            category=point.category,
            sub_category=point.sub_category,
            title=point.title,
            description=point.description,
            priority=point.priority,
            risk_level=point.risk_level
        )
        for point in test_points
    ]


@router.delete("/{test_point_id}")
async def delete_test_point(
    test_point_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    删除测试点

    删除指定的测试点
    """
    test_point = await session.get(TestPoint, test_point_id)

    if not test_point:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试点不存在"
        )

    await session.delete(test_point)
    await session.commit()

    return {"message": "测试点已删除"}
