"""
测试点生成服务 - 功能测试模块
基于需求文档生成测试点
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import json

from app.models.requirement import Requirement
from app.models.functional_test_point import TestPoint
from app.models.functional_test_case import FunctionalTestCase
from app.schemas.test_point_generation import (
    TestPointCategory,
    TestPointBase,
    TestPointGenerate,
    GeneratedTestPoints
)
from app.services.ai.llm_service import MultiVendorLLMService


class TestPointGenerationService:
    """测试点生成服务"""

    # Prompt模板
    GENERATE_TEST_POINTS_PROMPT = """你是一位资深的测试专家，负责根据需求文档生成全面的测试点。

## 需求文档
{requirement_text}

## 历史相关用例（参考）
{related_cases}

## 你的任务
基于需求文档生成测试点，覆盖以下维度：

### 1. 功能测试点
- 正常流程
- 异常流程
- 边界值
- 数据验证

### 2. 性能测试点
- 响应时间
- 并发压力
- 大数据量

### 3. 安全测试点
- 权限控制
- 数据加密
- 注入攻击防护

### 4. 兼容性测试点
- 浏览器兼容
- 系统兼容
- 分辨率适配

### 5. 易用性测试点
- 用户体验
- 交互设计
- 错误提示友好性

## 输出格式（JSON）:
```json
{{
  "test_points": [
    {{
      "category": "functional",
      "sub_category": "正常流程",
      "title": "手机号正确+验证码正确→登录成功",
      "description": "验证正常的登录流程",
      "priority": "p0",
      "risk_level": "low"
    }},
    {{
      "category": "functional",
      "sub_category": "异常流程",
      "title": "验证码错误→提示错误信息",
      "description": "验证输入错误验证码时的处理",
      "priority": "p1",
      "risk_level": "medium"
    }}
  ]
}}
```

## 注意事项
1. 每个测试点要有明确的标题，格式：输入条件→预期结果
2. 优先级说明：p0-核心功能, p1-重要功能, p2-一般功能, p3-边缘功能
3. 风险级别说明：high-高风险, medium-中风险, low-低风险
4. 优先覆盖核心业务流程和异常场景
5. 根据实际需求场景生成，不要照搬模板

现在，请根据需求文档生成测试点。
"""

    def __init__(self, session: AsyncSession, user_id: int):
        """
        初始化测试点生成服务

        Args:
            session: 数据库会话
            user_id: 用户ID
        """
        self.session = session
        self.user_id = user_id

    async def generate_test_points(
        self,
        data: TestPointGenerate
    ) -> GeneratedTestPoints:
        """
        生成测试点

        Args:
            data: 生成测试点的请求参数

        Returns:
            生成的测试点列表
        """
        # 1. 获取相关历史用例（如果需要）
        related_cases_text = ""
        if data.include_knowledge:
            related_cases_text = await self._get_related_test_cases(data.requirement_text)

        # 2. 获取LLM
        llm = await MultiVendorLLMService.get_default_llm(self.session, self.user_id)
        if not llm:
            raise ValueError("用户未配置AI服务，请先在AI配置中添加")

        # 3. 构建分类筛选条件
        category_filter = self._build_category_filter(data.categories)

        # 4. 构建prompt
        prompt = self.GENERATE_TEST_POINTS_PROMPT.format(
            requirement_text=data.requirement_text,
            related_cases=related_cases_text or "（无历史参考用例）"
        )

        # 添加分类筛选说明
        if category_filter:
            prompt += f"\n\n## 重点关注的测试分类\n{category_filter}"

        # 5. 调用LLM生成
        response = await llm.ainvoke([
            {"role": "user", "content": prompt}
        ])

        # 6. 解析响应
        test_points = self._parse_llm_response(response)

        # 7. 保存到数据库
        saved_points = await self._save_test_points(
            data.requirement_id,
            test_points
        )

        return GeneratedTestPoints(
            requirement_id=data.requirement_id,
            test_points=saved_points,
            total_count=len(saved_points),
            generation_metadata={
                "categories": [c.value for c in data.categories],
                "used_knowledge": data.include_knowledge,
                "llm_used": "default"
            }
        )

    async def _get_related_test_cases(self, requirement_text: str) -> str:
        """
        获取相关的历史测试用例

        Args:
            requirement_text: 需求文本

        Returns:
            格式化的相关用例文本
        """
        # TODO: 实现向量检索
        # 暂时使用简单的关键词匹配

        # 提取关键词
        keywords = self._extract_keywords(requirement_text)

        # 搜索相关的测试用例
        result = await self.session.execute(
            select(FunctionalTestCase)
            .limit(5)  # 暂时返回最近的5个用例
        )
        cases = result.scalars().all()

        if not cases:
            return ""

        # 格式化用例
        formatted = []
        for case in cases:
            formatted.append(f"""
用例标题: {case.title}
模块: {case.module_name}/{case.page_name}
优先级: {case.priority}
步骤: {len(case.steps)}步
""")

        return "\n".join(formatted)

    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        # 简单实现：提取中文词汇
        import re
        # 匹配2-4个字的中文词汇
        words = re.findall(r'[\u4e00-\u9fa5]{2,4}', text)
        # 返回出现频率最高的词
        from collections import Counter
        word_counts = Counter(words)
        return [word for word, count in word_counts.most_common(10)]

    def _build_category_filter(self, categories: List[TestPointCategory]) -> str:
        """构建分类筛选说明"""
        if not categories:
            return ""

        category_names = {
            TestPointCategory.FUNCTIONAL: "功能测试",
            TestPointCategory.PERFORMANCE: "性能测试",
            TestPointCategory.SECURITY: "安全测试",
            TestPointCategory.COMPATIBILITY: "兼容性测试",
            TestPointCategory.USABILITY: "易用性测试"
        }

        names = [category_names.get(c, c.value) for c in categories]
        return "重点关注：" + "、".join(names)

    def _parse_llm_response(self, response: str) -> List[TestPointBase]:
        """解析LLM响应"""
        try:
            # 尝试直接解析JSON
            data = json.loads(response)
            if "test_points" in data:
                points_data = data["test_points"]
            else:
                points_data = data

            # 转换为TestPointBase对象
            test_points = []
            for point_data in points_data:
                try:
                    test_points.append(TestPointBase(**point_data))
                except Exception as e:
                    print(f"解析测试点失败: {e}, 数据: {point_data}")
                    continue

            return test_points

        except json.JSONDecodeError:
            # 尝试提取JSON代码块
            import re
            match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
            if match:
                return self._parse_llm_response(match.group(1))

            # 如果还是失败，返回空列表
            print(f"无法解析LLM响应: {response[:200]}...")
            return []

    async def _save_test_points(
        self,
        requirement_id: int,
        test_points: List[TestPointBase]
    ) -> List[TestPointBase]:
        """保存测试点到数据库"""
        saved_points = []

        for point_data in test_points:
            test_point = TestPoint(
                requirement_id=requirement_id,
                category=point_data.category.value,
                sub_category=point_data.sub_category,
                title=point_data.title,
                description=point_data.description,
                priority=point_data.priority,
                risk_level=point_data.risk_level,
                is_ai_generated=True,
                confidence_score=0.85,  # AI生成的默认置信度
                status="draft"  # 草稿状态，待审核
            )

            self.session.add(test_point)
            saved_points.append(point_data)

        await self.session.commit()

        return saved_points


# 使用示例
"""
from app.services.test_point_generation_service import TestPointGenerationService
from app.schemas.test_point_generation import TestPointGenerate, TestPointCategory

async def example_usage():
    service = TestPointGenerationService(session, user_id=1)

    data = TestPointGenerate(
        requirement_id=1,
        requirement_text="用户登录功能：支持手机号+验证码登录...",
        categories=[
            TestPointCategory.FUNCTIONAL,
            TestPointCategory.SECURITY
        ]
    )

    result = await service.generate_test_points(data)
    print(f"生成了{result.total_count}个测试点")
    for point in result.test_points:
        print(f"  - [{point.category.value}] {point.title}")
"""
