"""
功能测试 API 端点 - 用例管理
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from datetime import datetime
import csv
import io
from app.core.db import get_session
from app.models import Requirement, FunctionalTestCase
from app.schemas.pagination import PageResponse

router = APIRouter()


# ==================== 需求管理 ====================

@router.get("/requirements", response_model=PageResponse[Requirement])
async def list_requirements(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    project_id: int = Query(None),
    session: AsyncSession = Depends(get_session)
):
    """获取需求列表"""
    skip = (page - 1) * size
    statement = select(Requirement)
    count_statement = select(func.count()).select_from(Requirement)
    
    if project_id:
        statement = statement.where(Requirement.project_id == project_id)
        count_statement = count_statement.where(Requirement.project_id == project_id)
    
    total = (await session.execute(count_statement)).scalar()
    result = await session.execute(statement.offset(skip).limit(size).order_by(Requirement.created_at.desc()))
    items = result.scalars().all()
    
    return PageResponse(items=items, total=total, page=page, size=size, pages=(total + size - 1) // size)


@router.post("/requirements", response_model=Requirement)
async def create_requirement(
    data: dict = Body(...),
    session: AsyncSession = Depends(get_session)
):
    """创建需求"""
    # 映射前端字段到后端字段
    mapped_data = {
        "name": data.get("title") or data.get("name", ""),
        "description": data.get("description", ""),
        "priority": data.get("priority", "p2"),
        "module_name": data.get("module_name", ""),
        "module_id": data.get("module_id"),
        "iteration": data.get("iteration"),
        "attachments": data.get("attachments", []),
        "clarification_status": data.get("clarification_status", "draft"),
        "risk_points": data.get("risk_points", []),
        "status": data.get("status", "draft"),
        "created_by": data.get("created_by", 1),  # 默认用户ID为1
    }

    # 自动生成 requirement_id
    from datetime import datetime
    date_prefix = datetime.now().strftime("%Y%m%d")

    # 查询当天已有的需求数量，生成序号
    result = await session.execute(
        select(Requirement).where(Requirement.requirement_id.like(f"REQ-{date_prefix}-%"))
    )
    existing_count = len(result.scalars().all())
    seq_number = existing_count + 1
    mapped_data["requirement_id"] = f"REQ-{date_prefix}-{seq_number:03d}"

    requirement = Requirement(**mapped_data)
    session.add(requirement)
    await session.commit()
    await session.refresh(requirement)
    return requirement


@router.get("/requirements/{requirement_id}", response_model=Requirement)
async def get_requirement(
    requirement_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取需求详情"""
    requirement = await session.get(Requirement, requirement_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="需求不存在")
    return requirement


@router.delete("/requirements/{requirement_id}")
async def delete_requirement(
    requirement_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除需求"""
    requirement = await session.get(Requirement, requirement_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="需求不存在")
    await session.delete(requirement)
    await session.commit()
    return {"deleted": requirement_id}


# ==================== 用例管理 ====================

@router.get("/cases", response_model=PageResponse[FunctionalTestCase])
async def list_cases(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    requirement_id: int = Query(None),
    priority: str = Query(None),
    session: AsyncSession = Depends(get_session)
):
    """获取用例列表"""
    skip = (page - 1) * size
    statement = select(FunctionalTestCase)
    count_statement = select(func.count()).select_from(FunctionalTestCase)
    
    if requirement_id:
        statement = statement.where(FunctionalTestCase.requirement_id == requirement_id)
        count_statement = count_statement.where(FunctionalTestCase.requirement_id == requirement_id)
    
    if priority:
        statement = statement.where(FunctionalTestCase.priority == priority)
        count_statement = count_statement.where(FunctionalTestCase.priority == priority)
    
    total = (await session.execute(count_statement)).scalar()
    result = await session.execute(statement.offset(skip).limit(size).order_by(FunctionalTestCase.created_at.desc()))
    items = result.scalars().all()
    
    return PageResponse(items=items, total=total, page=page, size=size, pages=(total + size - 1) // size)


@router.post("/cases", response_model=FunctionalTestCase)
async def create_case(
    data: dict = Body(...),
    session: AsyncSession = Depends(get_session)
):
    """创建用例"""
    case = FunctionalTestCase(**data)
    session.add(case)
    await session.commit()
    await session.refresh(case)
    return case


@router.get("/cases/{case_id}", response_model=FunctionalTestCase)
async def get_case(
    case_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取用例详情"""
    case = await session.get(FunctionalTestCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    return case


@router.put("/cases/{case_id}")
async def update_case(
    case_id: int,
    data: dict = Body(...),
    session: AsyncSession = Depends(get_session)
):
    """更新用例"""
    case = await session.get(FunctionalTestCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    
    for key, value in data.items():
        if hasattr(case, key):
            setattr(case, key, value)
    
    case.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(case)
    return case


@router.delete("/cases/{case_id}")
async def delete_case(
    case_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除用例"""
    case = await session.get(FunctionalTestCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    await session.delete(case)
    await session.commit()
    return {"deleted": case_id}


# ==================== 导入导出 ====================

@router.post("/cases/import")
async def import_cases(
    requirement_id: int = Query(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    """导入用例 (CSV格式)"""
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig')))
    
    imported = 0
    for row in reader:
        case = FunctionalTestCase(
            requirement_id=requirement_id,
            title=row.get('标题', row.get('title', '')),
            priority=row.get('优先级', row.get('priority', 'P2')),
            precondition=row.get('前置条件', row.get('precondition', '')),
            expected_result=row.get('预期结果', row.get('expected_result', '')),
            steps=[]  # 需要解析
        )
        session.add(case)
        imported += 1
    
    await session.commit()
    return {"imported": imported}


@router.get("/cases/export")
async def export_cases(
    requirement_id: int = Query(None),
    format: str = Query("csv"),
    session: AsyncSession = Depends(get_session)
):
    """导出用例"""
    statement = select(FunctionalTestCase)
    if requirement_id:
        statement = statement.where(FunctionalTestCase.requirement_id == requirement_id)
    
    result = await session.execute(statement)
    cases = result.scalars().all()
    
    # CSV 导出
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['标题', '优先级', '前置条件', '预期结果'])
    
    for case in cases:
        writer.writerow([case.title, case.priority, case.precondition or '', case.expected_result or ''])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cases_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# ==================== AI用例生成 ====================

@router.post("/ai/generate")
async def generate_cases_with_ai(
    requirement_id: int = Body(..., embed=True),
    model: str = Body("gpt-4o-mini", embed=True),
    session: AsyncSession = Depends(get_session)
):
    """使用AI生成测试用例"""
    import os
    
    # 获取需求
    requirement = await session.get(Requirement, requirement_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="需求不存在")
    
    # 创建任务记录
    task = AIGenerationTask(
        requirement_id=requirement_id,
        model=model,
        status="running"
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    
    # 构建提示词
    prompt = f"""根据以下需求，生成详细的功能测试用例：

需求编号: {requirement.requirement_id}
需求名称: {requirement.name}
需求描述: {requirement.description or '无'}

请生成测试用例，每个用例包含：
- 用例标题
- 优先级 (P0-P3)
- 前置条件
- 操作步骤 (表格形式: 步骤序号 | 操作步骤 | 预期结果)
- 预期结果

请以JSON格式返回，格式如下：
{{
    "cases": [
        {{
            "title": "用例标题",
            "priority": "P1",
            "precondition": "前置条件",
            "steps": [
                {{"step": "步骤1", "expected": "预期结果1"}},
                {{"step": "步骤2", "expected": "预期结果2"}}
            ],
            "expected_result": "最终预期结果"
        }}
    ]
}}
"""
    
    try:
        # 调用 LLM API
        llm_api_key = os.getenv("LLM_API_KEY", "")
        if not llm_api_key or llm_api_key == "your_api_key_here":
            # 模拟返回
            result = {
                "cases": [
                    {
                        "title": f"验证{requirement.name}基本功能",
                        "priority": "P1",
                        "precondition": "用户已登录系统",
                        "steps": [
                            {"step": "进入相关功能页面", "expected": "页面正常显示"},
                            {"step": "执行核心操作", "expected": "操作成功"}
                        ],
                        "expected_result": "功能正常运行"
                    }
                ]
            }
        else:
            # 真实调用 OpenAI
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {llm_api_key}"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    },
                    timeout=60
                )
                result = response.json()["choices"][0]["message"]["content"]
                import json
                result = json.loads(result)
        
        task.status = "completed"
        task.result = result
        task.completed_at = datetime.utcnow()
        
    except Exception as e:
        task.status = "failed"
        task.error_message = str(e)
    
    await session.commit()
    await session.refresh(task)
    
    return task


@router.post("/ai/import-to-cases")
async def import_ai_result_to_cases(
    task_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_session)
):
    """将AI生成结果导入为正式用例"""
    task = await session.get(AIGenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="任务未完成")
    
    cases_data = task.result.get("cases", [])
    imported = 0
    
    for case_data in cases_data:
        case = FunctionalTestCase(
            requirement_id=task.requirement_id,
            title=case_data.get("title", ""),
            priority=case_data.get("priority", "P2"),
            precondition=case_data.get("precondition", ""),
            steps=case_data.get("steps", []),
            expected_result=case_data.get("expected_result", "")
        )
        session.add(case)
        imported += 1
    
    await session.commit()
    return {"imported": imported}
