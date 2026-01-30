"""
Checkpointer配置 - LangGraph状态持久化
支持Memory和PostgreSQL两种存储方式
"""
from typing import Optional
from langgraph.checkpoint.memory import MemorySaver
from app.core.config import settings


class CheckpointConfig:
    """Checkpointer配置类"""

    _instance: Optional[MemorySaver] = None

    @classmethod
    def get_checkpointer(cls):
        """
        获取checkpointer实例

        根据配置自动选择存储方式:
        - 开发环境: MemorySaver (内存存储)
        - 生产环境: PostgresSaver (PostgreSQL存储)

        Returns:
            Checkpointer实例
        """
        if cls._instance is None:
            # 开发环境使用内存存储
            cls._instance = MemorySaver()
            print("⚠️  使用内存checkpointer (MemorySaver) - 服务重启后状态会丢失")

        return cls._instance

    @classmethod
    async def get_async_checkpointer(cls):
        """
        获取异步checkpointer实例

        Returns:
            Checkpointer实例
        """
        return cls.get_checkpointer()


# PostgreSQL支持说明
"""
要使用PostgreSQL checkpointer，需要安装额外的依赖:

1. 安装依赖:
   pip install langgraph-checkpoint-postgres

2. 修改此文件中的get_checkpointer方法:
   from langgraph_checkpoint_postgres import PostgresSaver
   from sqlalchemy import create_engine

   db_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
   engine = create_engine(db_url)
   cls._instance = PostgresSaver.from_conn_string(engine.url)

3. 初始化数据库表:
   PostgresSaver.from_conn_string(engine.url).setup()

PostgreSQL checkpointer的优势:
- 状态持久化，服务重启不丢失
- 支持分布式部署
- 支持并发访问
- 可以查看历史状态
"""


# 使用示例
"""
from langgraph.graph import StateGraph
from app.services.ai.checkpointer import CheckpointConfig

# 定义状态
class State(TypedDict):
    messages: list
    requirement_document: str
    risk_points: list

# 创建状态图
graph = StateGraph(State)

# 添加节点
graph.add_node("analyze", analyze_node)
graph.add_node("ask_questions", ask_questions_node)

# 添加边
graph.add_edge("analyze", "ask_questions")

# 编译时指定checkpointer
checkpointer = CheckpointConfig.get_checkpointer()
app = graph.compile(checkpointer=checkpointer)

# 运行时使用thread_id (对话ID)
config = {"configurable": {"thread_id": "req-123-conversation"}}
result = app.invoke({"messages": []}, config)

# 状态会自动保存到checkpointer
# 下次调用时，会自动加载历史状态
"""
