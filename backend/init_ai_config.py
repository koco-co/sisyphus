"""
初始化智谱AI配置测试数据

添加智谱AI配置到数据库
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.models.ai_config import AIProviderConfig
from app.services.ai_config_service import AIConfigService, EncryptionService


async def init_zhipu_config():
    """初始化智谱AI配置"""
    async for session in get_session():
        try:
            # 检查是否已存在智谱AI配置
            result = await session.execute(
                select(AIProviderConfig)
                .where(AIProviderConfig.provider_type == "glm")
                .where(AIProviderConfig.user_id == 1)  # 假设用户ID为1
            )
            existing = result.scalar_one_or_none()

            if existing:
                print("✅ 智谱AI配置已存在，跳过创建")
                return

            # 创建智谱AI配置
            config_data = {
                "provider_name": "智谱AI",
                "provider_type": "glm",
                "model_name": "glm-4-flash",
                "temperature": 0.7,
                "max_tokens": 4000,
                "is_enabled": True,
                "is_default": True,
                "api_endpoint": "https://open.bigmodel.cn/api/paas/v4"
            }

            # 加密API Key
            encrypted_key = EncryptionService.encrypt_api_key(
                "5b3312a29aad491d94c00be156be205f.f5JBJeb9axAoHfyC"
            )

            config = AIProviderConfig(
                user_id=1,
                provider_name=config_data["provider_name"],
                provider_type=config_data["provider_type"],
                model_name=config_data["model_name"],
                temperature=config_data["temperature"],
                max_tokens=config_data["max_tokens"],
                is_enabled=config_data["is_enabled"],
                is_default=config_data["is_default"],
                api_key_encrypted=encrypted_key,
                api_endpoint=config_data["api_endpoint"]
            )

            session.add(config)
            await session.commit()
            await session.refresh(config)

            print("✅ 智谱AI配置创建成功！")
            print(f"   配置ID: {config.id}")
            print(f"   厂商: {config.provider_name}")
            print(f"   模型: {config.model_name}")
            print(f"   API Key: 5b33...HfyC (已加密存储)")
            print("\n💡 提示: 你可以使用以下API测试配置:")
            print(f"   POST /api/v1/ai/configs/test")
            print(f"   {{")
            print(f"     \"provider_type\": \"glm\",")
            print(f"     \"api_key\": \"5b3312a29aad491d94c00be156be205f.f5JBJeb9axAoHfyC\",")
            print(f"     \"model_name\": \"glm-4-flash\"")
            print(f"   }}")

        except Exception as e:
            print(f"❌ 创建配置失败: {str(e)}")
            await session.rollback()
        finally:
            await session.close()


if __name__ == "__main__":
    print("=" * 60)
    print("初始化智谱AI配置")
    print("=" * 60)
    asyncio.run(init_zhipu_config())
    print("=" * 60)
