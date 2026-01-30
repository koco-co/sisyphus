"""
测试用例生成服务 - 功能测试模块
基于测试点生成详细的测试用例
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import json

from app.models.requirement import Requirement
from app.models.functional_test_point import TestPoint
from app.models.functional_test_case import FunctionalTestCase
from app.schemas.test_case_generation import (
    TestCaseGenerate,
    GeneratedTestCase,
    GeneratedTestCases,
    TestStep
)
from app.services.ai.llm_service import MultiVendorLLMService


class TestCaseGenerationService:
    """测试用例生成服务"""

    GENERATE_TEST_CASES_PROMPT = """你是一位资深的测试工程师，负责根据测试点和需求文档生成详细的测试用例。

## 需求文档
{requirement_text}

## 测试点
{test_points}

## 用例模板示例
{template_example}

## 你的任务
为每个测试点生成详细的测试用例，包括：
1. **用例标题**: 清晰描述测试场景
2. **优先级**: P0/P1/P2/P3
   - P0: 核心功能，必须测试
   - P1: 重要功能
   - P2: 一般功能
   - P3: 边缘功能
3. **前置条件**: 执行用例前需要满足的条件
4. **操作步骤**: 详细的操作步骤，序号化
5. **预期结果**: 每个步骤对应的预期结果，与步骤一一对应

## 输出格式（JSON）:
```json
{{
  "test_cases": [
    {{
      "module_name": "{module_name}",
      "page_name": "{page_name}",
      "title": "正常登录流程",
      "priority": "p0",
      "case_type": "functional",
      "preconditions": [
        "用户已注册",
        "手机号格式正确"
      ],
      "steps": [
        {{
          "step_number": 1,
          "action": "打开登录页面",
          "expected_result": "显示登录表单，包含手机号输入框、验证码输入框、登录按钮"
        }},
        {{
          "step_number": 2,
          "action": "输入正确手机号13800138000",
          "expected_result": "输入框显示手机号，格式正确"
        }}
      ],
      "tags": ["冒烟测试", "正交试验"],
      "estimated_time": 2,
      "complexity": "low"
    }}
  ]
}}
```

## 注意事项
1. 操作步骤要具体，避免模糊描述（如"点击按钮"应明确"点击哪个按钮"）
2. 预期结果要明确，可验证
3. 一个用例测试一个主要场景，避免混合多个场景
4. 步骤序号连续，不跳号
5. 标签要准确，便于后续筛选：
   - 冒烟测试：核心功能快速验证
   - 正交试验：覆盖多个变量组合
   - 边界值：边界条件测试
   - 异常场景：错误处理测试
6. 预估时间要合理（分钟）
7. 复杂度评估：low(1-3步)、medium(4-7步)、high(8步以上)

现在，请根据测试点生成测试用例。
"""

    def __init__(self, session: AsyncSession, user_id: int):
        """
        初始化测试用例生成服务

        Args:
            session: 数据库会话
            user_id: 用户ID
        """
        self.session = session
        self.user_id = user_id

    async def generate_test_cases(
        self,
        data: TestCaseGenerate
    ) -> GeneratedTestCases:
        """
        生成测试用例

        Args:
            data: 生成测试用例的请求参数

        Returns:
            生成的测试用例列表
        """
        # 1. 获取需求信息
        requirement = await self.session.get(Requirement, data.requirement_id)
        if not requirement:
            raise ValueError(f"需求ID {data.requirement_id} 不存在")

        # 2. 获取测试点
        test_points = []
        for tp_id in data.test_point_ids:
            tp = await self.session.get(TestPoint, tp_id)
            if tp:
                test_points.append(tp)

        if not test_points:
            raise ValueError("未找到有效的测试点")

        # 3. 获取LLM
        llm = await MultiVendorLLMService.get_default_llm(self.session, self.user_id)
        if not llm:
            raise ValueError("用户未配置AI服务，请先在AI配置中添加")

        # 4. 格式化测试点
        test_points_text = self._format_test_points(test_points)

        # 5. 获取模板示例
        template_example = self._get_template_example()

        # 6. 构建prompt
        prompt = self.GENERATE_TEST_CASES_PROMPT.format(
            requirement_text=requirement.description,
            test_points=test_points_text,
            module_name=data.module_name,
            page_name=data.page_name,
            template_example=template_example
        )

        # 7. 调用LLM生成
        response = await llm.ainvoke([
            {"role": "user", "content": prompt}
        ])

        # 8. 解析响应
        test_cases = self._parse_llm_response(response)

        # 9. 补充信息
        for tc in test_cases:
            tc.module_name = data.module_name
            tc.page_name = data.page_name
            tc.case_type = data.case_type.value

        # 10. 保存到数据库
        saved_cases = await self._save_test_cases(
            data.requirement_id,
            test_cases
        )

        return GeneratedTestCases(
            requirement_id=data.requirement_id,
            test_cases=saved_cases,
            total_count=len(saved_cases),
            generation_metadata={
                "test_point_count": len(test_points),
                "used_knowledge": data.include_knowledge,
                "module_name": data.module_name,
                "page_name": data.page_name
            }
        )

    def _format_test_points(self, test_points: List[TestPoint]) -> str:
        """格式化测试点"""
        formatted = []
        for idx, tp in enumerate(test_points, 1):
            formatted.append(f"""
{idx}. [{tp.category}] {tp.title}
   - 描述: {tp.description or '无'}
   - 优先级: {tp.priority}
   - 风险级别: {tp.risk_level or '未评估'}
""")
        return "\n".join(formatted)

    def _get_template_example(self) -> str:
        """获取用例模板示例"""
        return """## 用例示例

### 示例1: 正常登录
- **标题**: 正常登录流程
- **优先级**: P0
- **前置条件**: 用户已注册、手机号正常
- **步骤**:
  1. 打开登录页面
  2. 输入手机号13800138000
  3. 点击"获取验证码"按钮
  4. 输入收到的验证码
  5. 点击"登录"按钮
- **预期结果**: 每步操作正常，最后登录成功跳转到首页
- **标签**: 冒烟测试、核心功能
- **预估时间**: 2分钟
- **复杂度**: low

### 示例2: 异常登录-验证码错误
- **标题**: 验证码错误提示
- **优先级**: P1
- **前置条件**: 用户已注册
- **步骤**:
  1. 打开登录页面
  2. 输入手机号13800138000
  3. 点击"获取验证码"按钮
  4. 输入错误的验证码123456
  5. 点击"登录"按钮
- **预期结果**: 提示"验证码错误，请重新输入"
- **标签**: 异常场景、错误处理
- **预估时间**: 1分钟
- **复杂度**: low
"""

    def _parse_llm_response(self, response: str) -> List[GeneratedTestCase]:
        """解析LLM响应"""
        try:
            # 尝试直接解析JSON
            data = json.loads(response)
            if "test_cases" in data:
                cases_data = data["test_cases"]
            else:
                cases_data = data

            # 转换为GeneratedTestCase对象
            test_cases = []
            for case_data in cases_data:
                try:
                    # 处理steps字段
                    if "steps" in case_data and isinstance(case_data["steps"], list):
                        case_data["steps"] = [
                            TestStep(**step) if isinstance(step, dict) else step
                            for step in case_data["steps"]
                        ]

                    test_cases.append(GeneratedTestCase(**case_data))
                except Exception as e:
                    print(f"解析测试用例失败: {e}, 数据: {case_data}")
                    continue

            return test_cases

        except json.JSONDecodeError:
            # 尝试提取JSON代码块
            import re
            match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
            if match:
                return self._parse_llm_response(match.group(1))

            # 如果还是失败，返回空列表
            print(f"无法解析LLM响应: {response[:200]}...")
            return []

    async def _save_test_cases(
        self,
        requirement_id: int,
        test_cases: List[GeneratedTestCase]
    ) -> List[GeneratedTestCase]:
        """保存测试用例到数据库"""
        import uuid
        from datetime import datetime

        saved_cases = []

        for idx, case_data in enumerate(test_cases, 1):
            # 生成用例ID
            case_id = f"TC-{datetime.now().strftime('%Y%m%d')}-{requirement_id:03d}-{idx:03d}"

            # 构建步骤数据
            steps_data = [
                {
                    "step_number": step.step_number,
                    "action": step.action,
                    "expected_result": step.expected_result
                }
                for step in case_data.steps
            ]

            # 创建用例对象
            test_case = FunctionalTestCase(
                case_id=case_id,
                requirement_id=requirement_id,
                module_name=case_data.module_name,
                page_name=case_data.page_name,
                title=case_data.title,
                priority=case_data.priority,
                case_type=case_data.case_type,
                preconditions=case_data.preconditions,
                steps=steps_data,
                tags=case_data.tags,
                estimated_time=case_data.estimated_time,
                complexity=case_data.complexity,
                is_ai_generated=True,
                ai_model="default",
                status="draft"  # 草稿状态，待审核
            )

            self.session.add(test_case)
            saved_cases.append(case_data)

        await self.session.commit()

        return saved_cases


# 使用示例
"""
from app.services.test_case_generation_service import TestCaseGenerationService
from app.schemas.test_case_generation import TestCaseGenerate, CaseType

async def example_usage():
    service = TestCaseGenerationService(session, user_id=1)

    data = TestCaseGenerate(
        requirement_id=1,
        test_point_ids=[1, 2, 3],
        module_name="用户管理",
        page_name="登录",
        case_type=CaseType.FUNCTIONAL
    )

    result = await service.generate_test_cases(data)
    print(f"生成了{result.total_count}个测试用例")
    for case in result.test_cases:
        print(f"  - [{case.priority}] {case.title}")
        print(f"    步骤数: {len(case.steps)}, 预估时间: {case.estimated_time}分钟")
"""
