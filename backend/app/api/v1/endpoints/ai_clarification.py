"""
AI需求澄清API - 功能测试模块
提供多轮对话的需求澄清接口
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.services.ai.graphs.requirement_clarification_graph import RequirementClarificationGraph

router = APIRouter(tags=["AI需求澄清"])


class StreamingResponseGenerator:
    """流式响应生成器"""

    def __init__(self, graph, requirement_id: str, user_input: str):
        self.graph = graph
        self.requirement_id = requirement_id
        self.user_input = user_input

    async def generate(self):
        """生成流式响应"""
        try:
            async for chunk in self.graph.astream_chat(
                self.requirement_id,
                self.user_input
            ):
                # 将chunk转换为SSE格式
                data = json.dumps(chunk, ensure_ascii=False)
                yield f"data: {data}\n\n"

            # 发送结束标记
            yield "data: [DONE]\n\n"

        except Exception as e:
            # 发送错误信息
            error_data = json.dumps({
                "type": "error",
                "content": str(e)
            }, ensure_ascii=False)
            yield f"data: {error_data}\n\n"


@router.post("/clarify")
async def clarify_requirement(
    requirement_id: str,
    user_input: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    开始/继续需求澄清对话

    使用Server-Sent Events (SSE) 流式返回AI响应

    - **requirement_id**: 需求ID，用作会话标识
    - **user_input**: 用户的输入或回复

    返回SSE流，每条消息格式为：
    ```json
    {
      "type": "message",
      "content": "响应内容",
      "is_complete": false
    }
    ```
    """
    # 创建需求澄清图实例
    try:
        graph = RequirementClarificationGraph(session, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"初始化需求澄清图失败: {str(e)}"
        )

    # 创建流式响应生成器
    generator = StreamingResponseGenerator(graph, requirement_id, user_input)

    # 返回SSE流
    return StreamingResponse(
        generator.generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用Nginx缓冲
        }
    )


@router.post("/clarify/{requirement_id}/complete")
async def complete_clarification(
    requirement_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    完成需求澄清，获取最终的需求文档

    - **requirement_id**: 需求ID

    返回完整的需求文档、风险点和建议
    """
    # TODO: 从checkpointer中获取最终状态
    # 目前返回模拟数据
    return {
        "requirement_id": requirement_id,
        "status": "completed",
        "message": "需求澄清已完成",
        "data": {
            "requirement_document": "需求文档内容...",
            "risk_points": ["风险点1", "风险点2"],
            "suggestions": ["建议1", "建议2"]
        }
    }


@router.get("/clarify/{requirement_id}")
async def get_conversation(
    requirement_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取需求澄清对话历史

    - **requirement_id**: 需求ID

    返回该需求的所有对话历史
    """
    # TODO: 从数据库或checkpointer中获取对话历史
    # 目前返回空历史
    return {
        "requirement_id": requirement_id,
        "messages": [],
        "state": None
    }


@router.delete("/clarify/{requirement_id}")
async def reset_clarification(
    requirement_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    重置需求澄清对话

    清除指定需求ID的对话历史，重新开始

    - **requirement_id**: 需求ID
    """
    # TODO: 实现重置逻辑
    return {
        "requirement_id": requirement_id,
        "status": "reset",
        "message": "对话已重置"
    }
