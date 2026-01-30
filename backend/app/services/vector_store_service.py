"""
向量检索服务 - 功能测试模块
使用pgvector进行语义搜索
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import numpy as np

from app.models.test_case_knowledge import TestCaseKnowledge
from app.models.functional_test_case import FunctionalTestCase


class VectorStoreService:
    """向量检索服务"""

    def __init__(self, session: AsyncSession):
        """
        初始化向量检索服务

        Args:
            session: 数据库会话
        """
        self.session = session

    async def similarity_search(
        self,
        query_text: str,
        query_embedding: Optional[List[float]] = None,
        k: int = 5,
        threshold: float = 0.7,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        向量相似度搜索

        Args:
            query_text: 查询文本
            query_embedding: 预计算的查询向量（可选）
            k: 返回结果数量
            threshold: 相似度阈值（0-1）
            filters: 过滤条件，如 {"module_name": "用户管理", "priority": "p0"}

        Returns:
            相似测试用例列表
        """
        # 1. 如果没有提供查询向量，生成嵌入
        if query_embedding is None:
            query_embedding = await self._generate_embedding(query_text)
            if not query_embedding:
                # 如果嵌入生成失败，回退到文本匹配
                return await self._fallback_text_search(query_text, k, threshold, filters)

        # 2. 构建基础查询
        from sqlalchemy import func, text
        from pgvector.sqlalchemy import Vector

        statement = select(
            TestCaseKnowledge,
            FunctionalTestCase,
            func.cosine_distance(TestCaseKnowledge.embedding, query_embedding).label('distance')
        ).join(
            FunctionalTestCase,
            TestCaseKnowledge.test_case_id == FunctionalTestCase.id
        )

        # 3. 应用过滤条件
        if filters:
            if "module_name" in filters:
                statement = statement.where(
                    TestCaseKnowledge.module_name == filters["module_name"]
                )
            if "priority" in filters:
                statement = statement.where(
                    TestCaseKnowledge.priority == filters["priority"]
                )
            if "case_type" in filters:
                statement = statement.where(
                    TestCaseKnowledge.case_type == filters["case_type"]
                )

        # 4. 按相似度排序并限制结果数量
        # 余弦距离越小，相似度越高（距离 = 1 - 相似度）
        statement = statement.order_by('distance').limit(k)

        # 5. 执行查询
        result = await self.session.execute(statement)
        rows = result.all()

        # 6. 处理结果
        results = []
        for knowledge, test_case, distance in rows:
            # 将余弦距离转换为相似度
            similarity = 1 - distance

            # 过滤低于阈值的结果
            if similarity >= threshold:
                results.append({
                    "test_case": test_case,
                    "similarity": similarity,
                    "quality_score": knowledge.quality_score,
                    "embedding_model": knowledge.embedding_model
                })

        # 7. 如果向量搜索没有结果，回退到文本搜索
        if not results:
            return await self._fallback_text_search(query_text, k, threshold, filters)

        return results

    async def _fallback_text_search(
        self,
        query_text: str,
        k: int,
        threshold: float,
        filters: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """回退到文本搜索"""
        statement = select(TestCaseKnowledge).join(
            FunctionalTestCase,
            TestCaseKnowledge.test_case_id == FunctionalTestCase.id
        )

        # 应用过滤条件
        if filters:
            if "module_name" in filters:
                statement = statement.where(
                    TestCaseKnowledge.module_name == filters["module_name"]
                )
            if "priority" in filters:
                statement = statement.where(
                    TestCaseKnowledge.priority == filters["priority"]
                )
            if "case_type" in filters:
                statement = statement.where(
                    TestCaseKnowledge.case_type == filters["case_type"]
                )

        # 执行查询
        statement = statement.order_by(
            TestCaseKnowledge.quality_score.desc()
        ).limit(k)

        result = await self.session.execute(statement)
        knowledge_list = result.scalars().all()

        # 获取完整的测试用例信息
        results = []
        for knowledge in knowledge_list:
            test_case = await self.session.get(
                FunctionalTestCase,
                knowledge.test_case_id
            )

            if test_case:
                # 计算简单的文本相似度
                similarity = self._calculate_text_similarity(
                    query_text,
                    test_case
                )

                if similarity >= threshold:
                    results.append({
                        "test_case": test_case,
                        "similarity": similarity,
                        "quality_score": knowledge.quality_score,
                        "embedding_model": knowledge.embedding_model
                    })

        # 按相似度排序
        results.sort(key=lambda x: x["similarity"], reverse=True)

        return results[:k]

    async def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """生成文本的向量嵌入"""
        try:
            from langchain_openai import OpenAIEmbeddings
            import os

            # 获取默认的 AI 配置
            from app.services.ai.llm_service import MultiVendorLLMService

            # 尝试获取默认的 OpenAI 配置
            # 注意：这里需要从数据库获取配置，暂时使用环境变量
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                print("Warning: OPENAI_API_KEY not set, cannot generate embedding")
                return None

            embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=api_key
            )

            # 生成嵌入
            embedding = await embeddings.aembed_query(text)
            return embedding

        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None

    def _calculate_text_similarity(
        self,
        query_text: str,
        test_case: FunctionalTestCase
    ) -> float:
        """计算文本相似度（简单实现）"""
        from difflib import SequenceMatcher

        query_lower = query_text.lower()
        title_lower = test_case.title.lower()

        # 计算标题相似度
        title_similarity = SequenceMatcher(None, query_lower, title_lower).ratio()

        # 计算标签匹配度
        tag_score = 0.0
        if test_case.tags:
            for tag in test_case.tags:
                tag_lower = tag.lower()
                if query_lower in tag_lower or tag_lower in query_lower:
                    tag_score = max(tag_score, 0.8)
                elif SequenceMatcher(None, query_lower, tag_lower).ratio() > 0.6:
                    tag_score = max(tag_score, 0.6)

        # 综合相似度
        similarity = max(title_similarity, tag_score) * 0.8 + 0.2  # 基础分数 0.2

        return min(similarity, 1.0)

    async def add_test_case_to_knowledge(
        self,
        test_case: FunctionalTestCase,
        embedding: List[float],
        embedding_model: str = "text-embedding-3-small"
    ):
        """
        将测试用例添加到知识库

        Args:
            test_case: 测试用例对象
            embedding: 向量表示
            embedding_model: Embedding模型名称
        """
        # 检查是否已存在
        result = await self.session.execute(
            select(TestCaseKnowledge)
            .where(TestCaseKnowledge.test_case_id == test_case.id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # 更新现有记录
            existing.embedding = embedding
            existing.embedding_model = embedding_model
            existing.module_name = test_case.module_name
            existing.priority = test_case.priority
            existing.case_type = test_case.case_type
            existing.tags = test_case.tags or []
        else:
            # 创建新记录
            knowledge = TestCaseKnowledge(
                test_case_id=test_case.id,
                embedding=embedding,
                embedding_model=embedding_model,
                module_name=test_case.module_name,
                priority=test_case.priority,
                case_type=test_case.case_type,
                tags=test_case.tags or [],
                quality_score=8.0,  # 默认质量分
                usage_count=0
            )
            self.session.add(knowledge)

        await self.session.commit()

    async def get_knowledge_stats(
        self,
        module_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        获取知识库统计信息

        Args:
            module_name: 模块名称（可选）

        Returns:
            统计信息字典
        """
        statement = select(TestCaseKnowledge)

        if module_name:
            statement = statement.where(
                TestCaseKnowledge.module_name == module_name
            )

        result = await self.session.execute(statement)
        knowledge_list = result.scalars().all()

        total_count = len(knowledge_list)

        if total_count == 0:
            return {
                "total_count": 0,
                "module_name": module_name,
                "avg_quality_score": 0.0,
                "embedding_models": []
            }

        # 计算平均质量分
        avg_quality = sum(k.quality_score for k in knowledge_list) / total_count

        # 统计Embedding模型
        models = {}
        for k in knowledge_list:
            models[k.embedding_model] = models.get(k.embedding_model, 0) + 1

        return {
            "total_count": total_count,
            "module_name": module_name,
            "avg_quality_score": round(avg_quality, 2),
            "embedding_models": list(models.keys()),
            "model_distribution": models
        }


# 使用示例
"""
from app.services.vector_store_service import VectorStoreService

async def example_usage():
    service = VectorStoreService(session)

    # 相似度搜索
    results = await service.similarity_search(
        query_text="用户登录功能",
        k=5,
        threshold=0.7,
        filters={"module_name": "用户管理"}
    )

    for result in results:
        tc = result["test_case"]
        print(f"用例: {tc.title}")
        print(f"相似度: {result['similarity']}")
        print(f"质量分: {result['quality_score']}")

    # 获取统计信息
    stats = await service.get_knowledge_stats()
    print(f"知识库用例总数: {stats['total_count']}")
"""
