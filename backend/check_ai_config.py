"""查看现有AI配置"""
import asyncio
from app.core.db import get_session
from app.models.ai_config import AIProviderConfig
from sqlmodel import select

async def main():
    async for session in get_session():
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.provider_type == 'glm')
        )
        configs = result.scalars().all()

        print(f'\n找到 {len(configs)} 个智谱AI配置:')
        for config in configs:
            print(f'  ID: {config.id}')
            print(f'  User ID: {config.user_id}')
            print(f'  模型: {config.model_name}')
            print(f'  默认: {config.is_default}')
            print(f'  启用: {config.is_enabled}')
            print(f'  ---')

        # 如果已有配置，测试API连接
        if configs:
            from app.services.ai_config_service import AIConfigService
            from app.services.ai_config_service import EncryptionService

            config = configs[0]
            decrypted_key = EncryptionService.decrypt_api_key(config.api_key_encrypted)

            print('\n正在测试API连接...\n')
            result = await AIConfigService.test_api_connection(
                provider_type='glm',
                api_key=decrypted_key,
                model_name=config.model_name,
                api_endpoint=config.api_endpoint
            )

            print(f'测试结果: {result.message}')
            if not result.success and result.error:
                print(f'错误信息: {result.error}')

if __name__ == '__main__':
    asyncio.run(main())
