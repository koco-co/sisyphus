"""
需求澄清LangGraph状态图 - 功能测试模块
使用LangGraph实现多轮需求澄清对话
"""
from typing import TypedDict, Annotated, Sequence, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.llm_service import MultiVendorLLMService


# 定义状态
class RequirementClarificationState(TypedDict):
    """需求澄清状态"""
    # 用户输入
    user_input: str

    # 需求相关
    requirement_document: str  # 需求文档内容
    requirement_name: str  # 需求名称
    module_name: str  # 模块名称

    # 对话历史
    messages: Sequence[Dict[str, str]]  # [{"role": "user/assistant", "content": "..."}]

    # AI分析结果
    identified_issues: List[str]  # 识别到的问题
    risk_points: List[str]  # 风险点
    suggestions: List[str]  # 建议

    # 控制流程
    needs_clarification: bool  # 是否需要继续澄清
    is_complete: bool  # 是否完成
    question_count: int  # 已提问轮数

    # 用户回复
    user_response: str  # 用户对问题的回复


# Prompt模板
ANALYZE_REQUIREMENT_PROMPT = """你是一位资深的产品经理和测试专家，负责帮助用户将碎片化的需求转化为完整的需求文档。

## 用户当前需求
{user_input}

## 对话历史
{chat_history}

## 你的任务
1. 分析用户提供的需求描述和截图，识别不完整之处
2. 提出针对性的问题来澄清需求，包括：
   - 功能边界 (什么是in scope,什么是out of scope)
   - 异常场景 (失败场景、边界条件)
   - 非功能需求 (性能、安全、兼容性)
   - 风险点 (潜在的技术风险、业务风险)
3. 每次提问3-5个问题，避免一次性提问太多
4. 用专业但易懂的语言，避免过于技术化

## 回答格式（JSON）:
请严格按照以下JSON格式回答：
```json
{{
  "requirement_document": "根据当前信息整理的需求文档（Markdown格式）",
  "questions": [
    "问题1",
    "问题2",
    "问题3"
  ],
  "risk_points": [
    "风险1",
    "风险2"
  ],
  "suggestions": [
    "建议1",
    "建议2"
  ],
  "needs_clarification": true,
  "is_complete": false
}}
```

如果需求已经足够完整，可以将is_complete设为true，此时questions可以为空数组。

现在，请分析用户的需求并开始提问。
"""

UPDATE_REQUIREMENT_PROMPT = """你是一位资深的产品经理和测试专家，负责根据用户的回复更新需求文档。

## 当前需求文档
{requirement_document}

## 用户最新回复
{user_response}

## 对话历史
{chat_history}

## 你的任务
1. 根据用户的回复更新需求文档
2. 继续提出需要澄清的问题
3. 更新风险点和建议
4. 判断需求是否已经完整

## 回答格式（JSON）:
```json
{{
  "requirement_document": "更新后的需求文档（Markdown格式）",
  "questions": [
    "新问题1",
    "新问题2"
  ],
  "risk_points": [
    "更新后的风险1",
    "更新后的风险2"
  ],
  "suggestions": [
    "更新后的建议1"
  ],
  "needs_clarification": true,
  "is_complete": false
}}
```

如果需求已经完整，将is_complete设为true，questions可以为空数组。

现在，请根据用户的回复更新需求文档。
"""


class RequirementClarificationGraph:
    """需求澄清状态图"""

    def __init__(self, session: AsyncSession, user_id: int):
        """
        初始化需求澄清图

        Args:
            session: 数据库会话
            user_id: 用户ID
        """
        self.session = session
        self.user_id = user_id
        self.checkpointer = MemorySaver()
        self.graph = None
        self._build_graph()

    def _build_graph(self):
        """构建状态图"""
        # 创建状态图
        workflow = StateGraph(RequirementClarificationState)

        # 添加节点
        workflow.add_node("analyze_requirement", self.analyze_requirement_node)
        workflow.add_node("update_requirement", self.update_requirement_node)
        workflow.add_node("generate_response", self.generate_response_node)

        # 设置入口点
        workflow.set_entry_point("analyze_requirement")

        # 添加条件边
        workflow.add_conditional_edges(
            "analyze_requirement",
            self.should_continue_clarification,
            {
                "continue": "update_requirement",
                "complete": "generate_response"
            }
        )

        workflow.add_conditional_edges(
            "update_requirement",
            self.should_continue_clarification,
            {
                "continue": "generate_response",
                "complete": "generate_response"
            }
        )

        workflow.add_edge("generate_response", END)

        # 编译图
        self.graph = workflow.compile(checkpointer=self.checkpointer)

    async def analyze_requirement_node(
        self,
        state: RequirementClarificationState
    ) -> Dict[str, Any]:
        """
        分析需求节点

        首次调用时分析用户需求，生成初始问题
        """
        print("🔍 [analyze_requirement] 分析用户需求...")

        # 获取用户的默认LLM
        llm = await MultiVendorLLMService.get_default_llm(self.session, self.user_id)
        if not llm:
            raise ValueError("用户未配置AI服务，请先在AI配置中添加")

        # 构建prompt
        chat_history = self._format_chat_history(state.get("messages", []))

        prompt = ANALYZE_REQUIREMENT_PROMPT.format(
            user_input=state["user_input"],
            chat_history=chat_history
        )

        # 调用LLM
        response = await llm.ainvoke([
            {"role": "user", "content": prompt}
        ])

        # 解析JSON响应
        import json
        try:
            result = self._extract_json(response)

            return {
                "requirement_document": result.get("requirement_document", ""),
                "identified_issues": result.get("questions", []),
                "risk_points": result.get("risk_points", []),
                "suggestions": result.get("suggestions", []),
                "needs_clarification": result.get("needs_clarification", True),
                "is_complete": result.get("is_complete", False),
                "question_count": 1,
            }
        except Exception as e:
            print(f"解析LLM响应失败: {e}")
            return {
                "requirement_document": state["user_input"],
                "identified_issues": ["需求描述不够详细，请提供更多信息"],
                "risk_points": [],
                "suggestions": [],
                "needs_clarification": True,
                "is_complete": False,
                "question_count": 1,
            }

    async def update_requirement_node(
        self,
        state: RequirementClarificationState
    ) -> Dict[str, Any]:
        """
        更新需求节点

        根据用户的回复更新需求文档，继续提问
        """
        print("📝 [update_requirement] 更新需求文档...")

        # 获取LLM
        llm = await MultiVendorLLMService.get_default_llm(self.session, self.user_id)

        # 构建prompt
        chat_history = self._format_chat_history(state.get("messages", []))

        prompt = UPDATE_REQUIREMENT_PROMPT.format(
            requirement_document=state.get("requirement_document", ""),
            user_response=state.get("user_response", ""),
            chat_history=chat_history
        )

        # 调用LLM
        response = await llm.ainvoke([
            {"role": "user", "content": prompt}
        ])

        # 解析JSON响应
        import json
        try:
            result = self._extract_json(response)

            return {
                "requirement_document": result.get("requirement_document", state.get("requirement_document", "")),
                "identified_issues": result.get("questions", []),
                "risk_points": result.get("risk_points", []),
                "suggestions": result.get("suggestions", []),
                "needs_clarification": result.get("needs_clarification", True),
                "is_complete": result.get("is_complete", False),
                "question_count": state.get("question_count", 0) + 1,
            }
        except Exception as e:
            print(f"解析LLM响应失败: {e}")
            return {
                "needs_clarification": False,
                "is_complete": True,
                "question_count": state.get("question_count", 0) + 1,
            }

    async def generate_response_node(
        self,
        state: RequirementClarificationState
    ) -> Dict[str, Any]:
        """
        生成响应节点

        向用户返回当前的问题和需求文档
        """
        print("💬 [generate_response] 生成用户响应...")

        # 构建响应文本
        if state.get("is_complete", False):
            response_content = f"""## ✅ 需求澄清完成

### 需求文档
{state.get('requirement_document', '')}

### 识别到的风险点
{self._format_list(state.get('risk_points', []))}

### 建议
{self._format_list(state.get('suggestions', []))}

---

需求澄清已完成，您可以继续下一步操作。"""
        else:
            response_content = f"""## 🔍 需求澄清

### 当前需求文档
{state.get('requirement_document', '')}

### 需要确认的问题
{self._format_list(state.get('identified_issues', []))}

### 识别到的风险点
{self._format_list(state.get('risk_points', []))}

### 💡 建议
{self._format_list(state.get('suggestions', []))}

---

请回答以上问题，以便完善需求文档。"""

        # 添加到消息历史
        messages = list(state.get("messages", []))
        messages.append({
            "role": "assistant",
            "content": response_content
        })

        return {
            "messages": messages,
        }

    def should_continue_clarification(self, state: Dict[str, Any]) -> str:
        """
        判断是否继续澄清

        Returns:
            "continue" 或 "complete"
        """
        is_complete = state.get("is_complete", False)
        needs_clarification = state.get("needs_clarification", True)
        question_count = state.get("question_count", 0)

        # 最多提问5轮
        max_questions = 5

        if is_complete or not needs_clarification or question_count >= max_questions:
            return "complete"
        else:
            return "continue"

    def _format_chat_history(self, messages: List[Dict[str, str]]) -> str:
        """格式化聊天历史"""
        if not messages:
            return "（无历史对话）"

        formatted = []
        for msg in messages[-5:]:  # 只显示最近5条
            role = "用户" if msg["role"] == "user" else "AI助手"
            formatted.append(f"{role}: {msg['content']}")

        return "\n".join(formatted)

    def _format_list(self, items: List[str]) -> str:
        """格式化列表"""
        if not items:
            return "（无）"

        return "\n".join([f"- {item}" for item in items])

    def _extract_json(self, response: str) -> Dict[str, Any]:
        """从LLM响应中提取JSON"""
        import json
        import re

        # 尝试直接解析
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # 尝试提取代码块中的JSON
        match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # 尝试提取JSON对象
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError("无法从响应中提取JSON")

    async def astream_chat(
        self,
        requirement_id: str,
        user_input: str,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        流式对话接口

        Args:
            requirement_id: 需求ID（用作thread_id）
            user_input: 用户输入
            config: 配置参数

        Yields:
            响应片段
        """
        if config is None:
            config = {"configurable": {"thread_id": requirement_id}}

        # 初始状态
        initial_state = {
            "user_input": user_input,
            "requirement_document": "",
            "requirement_name": "",
            "module_name": "",
            "messages": [],
            "identified_issues": [],
            "risk_points": [],
            "suggestions": [],
            "needs_clarification": True,
            "is_complete": False,
            "question_count": 0,
            "user_response": "",
        }

        # 运行状态图
        async for event in self.graph.astream(initial_state, config):
            node_name = list(event.keys())[0]
            node_output = event[node_name]

            # 如果是generate_response节点，yield响应
            if node_name == "generate_response" and "messages" in node_output:
                messages = node_output["messages"]
                if messages:
                    latest_message = messages[-1]["content"]
                    yield {
                        "type": "message",
                        "content": latest_message,
                        "is_complete": node_output.get("is_complete", False),
                    }


# 使用示例
"""
from app.services.ai.graphs.requirement_clarification_graph import RequirementClarificationGraph
from sqlalchemy.ext.asyncio import AsyncSession

async def example_usage():
    # 创建状态图实例
    graph = RequirementClarificationGraph(session, user_id=1)

    # 开始需求澄清
    requirement_id = "req-123"
    user_input = "我想做一个用户登录功能"

    async for chunk in graph.astream_chat(requirement_id, user_input):
        if chunk["type"] == "message":
            print(chunk["content"])
            print(f"\n完成状态: {chunk['is_complete']}")
"""
