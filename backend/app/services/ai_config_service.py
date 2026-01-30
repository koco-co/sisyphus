"""
AI配置服务 - 功能测试模块
处理AI厂商配置的业务逻辑
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from cryptography.fernet import Fernet
import base64
import os

from app.models.ai_config import AIProviderConfig
from app.schemas.ai_config import (
    AIProviderConfigCreate,
    AIProviderConfigUpdate,
    AIProviderConfigResponse,
    ProviderType
)


class EncryptionService:
    """加密服务"""

    # 从环境变量获取密钥，如果不存在则生成一个
    _key = os.getenv("ENCRYPTION_KEY")
    if not _key:
        # 生成一个32字节的密钥（生产环境应该从环境变量读取）
        _key = base64.urlsafe_b64encode(b"Sisyphus-X-2025-Enc-Key!!").decode()

    # 确保密钥是有效的Fernet密钥
    try:
        _cipher = Fernet(_key.encode() if isinstance(_key, str) else _key)
    except Exception:
        # 如果环境变量的密钥无效，生成一个新密钥
        _key = Fernet.generate_key().decode()
        _cipher = Fernet(_key)

    @classmethod
    def encrypt_api_key(cls, api_key: str) -> str:
        """加密API Key"""
        if not api_key:
            return ""
        encrypted = cls._cipher.encrypt(api_key.encode())
        return encrypted.decode()

    @classmethod
    def decrypt_api_key(cls, encrypted_key: str) -> str:
        """解密API Key"""
        if not encrypted_key:
            return ""
        try:
            decrypted = cls._cipher.decrypt(encrypted_key.encode())
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"解密失败: {str(e)}")

    @classmethod
    def mask_api_key(cls, api_key: str) -> str:
        """脱敏API Key，只显示前4位和后4位"""
        if not api_key or len(api_key) <= 8:
            return "****"
        return f"{api_key[:4]}...{api_key[-4:]}"


class AIConfigService:
    """AI配置服务"""

    @staticmethod
    async def get_user_configs(
        session: AsyncSession,
        user_id: int
    ) -> List[AIProviderConfigResponse]:
        """获取用户的所有AI配置"""
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .order_by(AIProviderConfig.is_default.desc(), AIProviderConfig.created_at)
        )
        configs = result.scalars().all()

        # 转换为响应格式（脱敏API Key）
        responses = []
        for config in configs:
            try:
                # 解密并脱敏API Key
                decrypted_key = EncryptionService.decrypt_api_key(config.api_key_encrypted)
                masked_key = EncryptionService.mask_api_key(decrypted_key)

                # 创建响应对象（兼容 Pydantic v1 和 v2）
                response_data = {
                    'id': config.id,
                    'provider_name': config.provider_name,
                    'provider_type': config.provider_type,
                    'model_name': config.model_name,
                    'temperature': config.temperature,
                    'max_tokens': config.max_tokens,
                    'is_enabled': config.is_enabled,
                    'is_default': config.is_default,
                    'api_key_masked': masked_key,
                    'api_endpoint': config.api_endpoint,
                    'user_id': config.user_id,
                    'created_at': config.created_at,
                    'updated_at': config.updated_at,
                }
                response = AIProviderConfigResponse(**response_data)
                responses.append(response)
            except Exception as e:
                # 跳过解密失败的配置
                continue

        return responses

    @staticmethod
    async def get_default_config(
        session: AsyncSession,
        user_id: int
    ) -> Optional[AIProviderConfigResponse]:
        """获取用户的默认AI配置"""
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .where(AIProviderConfig.is_default == True)
            .where(AIProviderConfig.is_enabled == True)
            .order_by(AIProviderConfig.created_at.desc())  # 按创建时间降序，获取最新的
            .limit(1)  # 只获取一条记录
        )
        config = result.scalar_one_or_none()

        if not config:
            return None

        try:
            # 解密并脱敏API Key
            decrypted_key = EncryptionService.decrypt_api_key(config.api_key_encrypted)
            masked_key = EncryptionService.mask_api_key(decrypted_key)

            # 创建响应对象（兼容 Pydantic v1 和 v2）
            response_data = {
                'id': config.id,
                'provider_name': config.provider_name,
                'provider_type': config.provider_type,
                'model_name': config.model_name,
                'temperature': config.temperature,
                'max_tokens': config.max_tokens,
                'is_enabled': config.is_enabled,
                'is_default': config.is_default,
                'api_key_masked': masked_key,
                'api_endpoint': config.api_endpoint,
                'user_id': config.user_id,
                'created_at': config.created_at,
                'updated_at': config.updated_at,
            }
            return AIProviderConfigResponse(**response_data)
        except Exception as e:
            # 解密或其他错误，返回 None
            return None

    @staticmethod
    async def get_config_by_id(
        session: AsyncSession,
        config_id: int,
        user_id: int
    ) -> Optional[AIProviderConfigResponse]:
        """根据ID获取AI配置"""
        config = await session.get(AIProviderConfig, config_id)

        if not config or config.user_id != user_id:
            return None

        # 解密并脱敏API Key
        decrypted_key = EncryptionService.decrypt_api_key(config.api_key_encrypted)
        masked_key = EncryptionService.mask_api_key(decrypted_key)

        # 创建响应对象（兼容 Pydantic v1 和 v2）
        response_data = {
            'id': config.id,
            'provider_name': config.provider_name,
            'provider_type': config.provider_type,
            'model_name': config.model_name,
            'temperature': config.temperature,
            'max_tokens': config.max_tokens,
            'is_enabled': config.is_enabled,
            'is_default': config.is_default,
            'api_key_masked': masked_key,
            'api_endpoint': config.api_endpoint,
            'user_id': config.user_id,
            'created_at': config.created_at,
            'updated_at': config.updated_at,
        }
        return AIProviderConfigResponse(**response_data)

    @staticmethod
    async def create_config(
        session: AsyncSession,
        user_id: int,
        data: AIProviderConfigCreate
    ) -> AIProviderConfigResponse:
        """创建AI配置"""
        # 如果设置为默认，需要取消其他配置的默认状态
        if data.is_default:
            await AIConfigService._clear_default_flag(session, user_id, data.provider_type)

        # 加密API Key
        encrypted_key = EncryptionService.encrypt_api_key(data.api_key)

        # 创建配置对象
        config = AIProviderConfig(
            user_id=user_id,
            provider_name=data.provider_name,
            provider_type=data.provider_type.value,
            model_name=data.model_name,
            temperature=data.temperature,
            max_tokens=data.max_tokens,
            is_enabled=data.is_enabled,
            is_default=data.is_default,
            api_key_encrypted=encrypted_key,
            api_endpoint=data.api_endpoint
        )

        session.add(config)
        await session.commit()
        await session.refresh(config)

        return AIProviderConfigResponse(
            **config.__dict__,
            api_key_masked=EncryptionService.mask_api_key(data.api_key)
        )

    @staticmethod
    async def update_config(
        session: AsyncSession,
        config_id: int,
        user_id: int,
        data: AIProviderConfigUpdate
    ) -> Optional[AIProviderConfigResponse]:
        """更新AI配置"""
        config = await session.get(AIProviderConfig, config_id)

        if not config or config.user_id != user_id:
            return None

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)

        # 处理API Key更新
        if "api_key" in update_data and update_data["api_key"]:
            update_data["api_key_encrypted"] = EncryptionService.encrypt_api_key(
                update_data.pop("api_key")
            )

        # 如果设置为默认，需要取消其他配置的默认状态
        if data.is_default and not config.is_default:
            await AIConfigService._clear_default_flag(
                session, user_id, config.provider_type
            )

        # 应用更新
        for field, value in update_data.items():
            setattr(config, field, value)

        await session.commit()
        await session.refresh(config)

        return AIProviderConfigResponse(
            **config.__dict__,
            api_key_masked=EncryptionService.mask_api_key(
                EncryptionService.decrypt_api_key(config.api_key_encrypted)
            )
        )

    @staticmethod
    async def delete_config(
        session: AsyncSession,
        config_id: int,
        user_id: int
    ) -> bool:
        """删除AI配置"""
        config = await session.get(AIProviderConfig, config_id)

        if not config or config.user_id != user_id:
            return False

        await session.delete(config)
        await session.commit()
        return True

    @staticmethod
    async def _clear_default_flag(
        session: AsyncSession,
        user_id: int,
        provider_type: str
    ):
        """清除用户指定厂商类型的默认标记"""
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .where(AIProviderConfig.provider_type == provider_type)
            .where(AIProviderConfig.is_default == True)
        )
        configs = result.scalars().all()

        for config in configs:
            config.is_default = False

        await session.commit()

    @staticmethod
    def decrypt_config_key(config: AIProviderConfig) -> str:
        """解密配置的API Key（内部使用）"""
        return EncryptionService.decrypt_api_key(config.api_key_encrypted)
