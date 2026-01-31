"""
AI配置管理API - 功能测试模块
提供AI厂商配置的增删改查接口
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.ai_config import (
    AIProviderConfigCreate,
    AIProviderConfigUpdate,
    AIProviderConfigResponse,
    AIProviderConfigTest,
    TestResult,
    PRESET_CONFIGS
)
from app.services.ai_config_service import AIConfigService

router = APIRouter(tags=["AI配置管理"])


@router.get("/", response_model=List[AIProviderConfigResponse])
async def list_ai_configs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户的所有AI配置

    返回用户的AI配置列表，API Key已脱敏
    """
    configs = await AIConfigService.get_user_configs(session, current_user.id)
    return configs


@router.get("/default", response_model=AIProviderConfigResponse)
async def get_default_config(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取用户的默认AI配置

    返回用户标记为默认的AI配置
    """
    config = await AIConfigService.get_default_config(session, current_user.id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到默认AI配置，请先创建配置"
        )

    return config


@router.get("/{config_id}", response_model=AIProviderConfigResponse)
async def get_ai_config(
    config_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    获取指定ID的AI配置

    只能访问自己创建的配置
    """
    config = await AIConfigService.get_config_by_id(session, config_id, current_user.id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在或无权访问"
        )

    return config


@router.post("/", response_model=AIProviderConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_config(
    data: AIProviderConfigCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    创建新的AI配置

    - **provider_name**: 厂商名称（如OpenAI、Anthropic）
    - **provider_type**: 厂商类型
    - **model_name**: 模型名称（如gpt-4、claude-3-opus）
    - **api_key**: API密钥（将被加密存储）
    - **temperature**: 温度参数（0.0-2.0）
    - **max_tokens**: 最大token数
    - **is_default**: 是否设为默认配置
    """
    try:
        config = await AIConfigService.create_config(session, current_user.id, data)
        return config
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建配置失败: {str(e)}"
        )


@router.put("/{config_id}", response_model=AIProviderConfigResponse)
async def update_ai_config(
    config_id: int,
    data: AIProviderConfigUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    更新AI配置

    可以部分更新配置字段，API Key如果提供则更新
    """
    config = await AIConfigService.update_config(
        session, config_id, current_user.id, data
    )

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在或无权访问"
        )

    return config


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_config(
    config_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    删除AI配置

    只能删除自己创建的配置
    """
    success = await AIConfigService.delete_config(session, config_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在或无权访问"
        )


@router.get("/presets/{provider_type}", response_model=dict)
async def get_preset_config(provider_type: str):
    """
    获取预设的AI厂商配置模板

    返回指定厂商类型的推荐配置
    """
    if provider_type not in PRESET_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的厂商类型: {provider_type}。支持的类型: {list(PRESET_CONFIGS.keys())}"
        )

    return PRESET_CONFIGS[provider_type]


@router.get("/presets", response_model=dict)
async def list_preset_configs():
    """
    获取所有预设的AI厂商配置模板

    返回所有支持的厂商类型及其推荐配置
    """
    return {
        "presets": PRESET_CONFIGS,
        "supported_types": list(PRESET_CONFIGS.keys())
    }


@router.post("/test", response_model=TestResult)
async def test_api_config(
    data: AIProviderConfigTest
):
    """
    测试AI配置的API连接是否有效

    - **provider_type**: AI厂商类型 (openai, anthropic, glm, qwen, qianfan)
    - **api_key**: API密钥
    - **model_name**: 模型名称
    - **api_endpoint**: 自定义API端点（可选）

    返回测试结果，包含连接状态和错误信息（如果有）
    """
    try:
        result = await AIConfigService.test_api_connection(
            provider_type=data.provider_type.value,
            api_key=data.api_key,
            model_name=data.model_name,
            api_endpoint=data.api_endpoint
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"测试API连接失败: {str(e)}"
        )
