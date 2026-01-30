"""
多厂商LLM服务 - 功能测试模块
支持OpenAI、Anthropic、通义千问、文心一言
"""
from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import QianfanChatEndpoint
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.ai_config import AIProviderConfig
from app.services.ai_config_service import AIConfigService


class MultiVendorLLMService:
    """多厂商LLM服务"""

    def __init__(self, config: AIProviderConfig):
        """
        初始化LLM服务

        Args:
            config: AI厂商配置对象
        """
        self.config = config
        self._provider_type = config.provider_type
        self._decrypted_api_key = AIConfigService.decrypt_config_key(config)

    def get_llm(self) -> Any:
        """
        获取LLM实例

        Returns:
            LLM实例（langchain聊天模型）
        """
        provider_type = self._provider_type

        # 构建通用参数
        kwargs = {
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

        # 根据厂商类型创建对应的LLM实例
        if provider_type == "openai":
            return ChatOpenAI(
                model=self.config.model_name,
                openai_api_key=self._decrypted_api_key,
                base_url=self.config.api_endpoint,
                **kwargs
            )

        elif provider_type == "anthropic":
            return ChatAnthropic(
                model=self.config.model_name,
                anthropic_api_key=self._decrypted_api_key,
                base_url=self.config.api_endpoint,
                **kwargs
            )

        elif provider_type == "qwen":
            # 阿里云通义千问
            from langchain_community.chat_models.tongyi import ChatTongyi
            return ChatTongyi(
                dashscope_api_key=self._decrypted_api_key,
                model_name=self.config.model_name,
                **kwargs
            )

        elif provider_type == "qianfan":
            # 百度文心一言
            return QianfanChatEndpoint(
                qianfan_api_key=self._decrypted_api_key,
                model=self.config.model_name,
                **kwargs
            )

        else:
            raise ValueError(f"不支持的AI厂商: {provider_type}")

    @staticmethod
    async def get_default_llm(session: AsyncSession, user_id: int) -> Optional[Any]:
        """
        获取用户的默认LLM实例

        Args:
            session: 数据库会话
            user_id: 用户ID

        Returns:
            LLM实例或None（如果没有默认配置）
        """
        # 获取默认配置
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .where(AIProviderConfig.is_default == True)
            .where(AIProviderConfig.is_enabled == True)
        )
        config = result.scalar_one_or_none()

        if not config:
            return None

        # 创建并返回LLM实例
        llm_service = MultiVendorLLMService(config)
        return llm_service.get_llm()

    @staticmethod
    async def get_llm_by_provider(
        session: AsyncSession,
        user_id: int,
        provider_type: str
    ) -> Optional[Any]:
        """
        根据厂商类型获取LLM实例

        Args:
            session: 数据库会话
            user_id: 用户ID
            provider_type: 厂商类型

        Returns:
            LLM实例或None
        """
        # 获取指定厂商的配置
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .where(AIProviderConfig.provider_type == provider_type)
            .where(AIProviderConfig.is_enabled == True)
            .order_by(AIProviderConfig.is_default.desc())
        )
        config = result.scalar_one_or_none()

        if not config:
            return None

        # 创建并返回LLM实例
        llm_service = MultiVendorLLMService(config)
        return llm_service.get_llm()

    async def ainvoke(self, messages: List[Dict[str, str]]) -> str:
        """
        异步调用LLM

        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]

        Returns:
            LLM响应文本
        """
        llm = self.get_llm()

        # 转换消息格式（如果需要）
        from langchain.schema import HumanMessage, AIMessage, SystemMessage
        lc_messages = []
        for msg in messages:
            if msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))

        # 调用LLM
        response = await llm.ainvoke(lc_messages)
        return response.content

    async def astream(self, messages: List[Dict[str, str]]):
        """
        异步流式调用LLM

        Args:
            messages: 消息列表

        Yields:
            LLM响应文本片段
        """
        llm = self.get_llm()

        # 转换消息格式
        from langchain.schema import HumanMessage, AIMessage, SystemMessage
        lc_messages = []
        for msg in messages:
            if msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))

        # 流式调用LLM
        async for chunk in llm.astream(lc_messages):
            yield chunk.content

    def get_model_info(self) -> Dict[str, Any]:
        """
        获取当前模型信息

        Returns:
            模型信息字典
        """
        return {
            "provider_type": self._provider_type,
            "provider_name": self.config.provider_name,
            "model_name": self.config.model_name,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }


# 使用示例
"""
from app.services.ai.llm_service import MultiVendorLLMService
from sqlalchemy.ext.asyncio import AsyncSession

async def example_usage():
    # 方式1: 使用配置对象创建
    config = ... # 从数据库获取配置
    llm_service = MultiVendorLLMService(config)
    llm = llm_service.get_llm()
    response = await llm.ainvoke([{"role": "user", "content": "Hello"}])

    # 方式2: 直接获取用户默认LLM
    llm = await MultiVendorLLMService.get_default_llm(session, user_id)
    if llm:
        response = await llm.ainvoke([{"role": "user", "content": "Hello"}])

    # 方式3: 根据厂商类型获取
    llm = await MultiVendorLLMService.get_llm_by_provider(session, user_id, "openai")
"""
