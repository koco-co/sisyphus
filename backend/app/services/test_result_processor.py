"""
测试结果处理器 - 解析 API Engine 输出并存储到数据库
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.api_test_case import ApiTestExecution, ApiTestStepResult


class TestResultProcessor:
    """测试结果处理器"""

    def __init__(self):
        """初始化处理器"""

    async def process_result(
        self,
        execution_id: int,
        raw_result: Dict[str, Any],
        session: AsyncSession
    ) -> None:
        """
        处理 API Engine 返回的结果并存储到数据库

        Args:
            execution_id: 执行记录 ID
            raw_result: API Engine 返回的原始结果
            session: 数据库会话
        """
        # 获取执行记录
        execution = await session.get(ApiTestExecution, execution_id)
        if not execution:
            raise ValueError(f"执行记录不存在: {execution_id}")

        # 提取基本信息
        test_case_info = raw_result.get("test_case", {})
        execution.status = self._map_status(test_case_info.get("status", "error"))
        execution.duration = test_case_info.get("duration")

        # 提取时间信息
        if test_case_info.get("start_time"):
            execution.started_at = self._parse_datetime(test_case_info["start_time"])

        if test_case_info.get("end_time"):
            execution.completed_at = self._parse_datetime(test_case_info["end_time"])

        # 提取统计信息
        statistics = self.extract_statistics(raw_result)
        execution.total_steps = statistics.get("total_steps", 0)
        execution.passed_steps = statistics.get("passed_steps", 0)
        execution.failed_steps = statistics.get("failed_steps", 0)
        execution.skipped_steps = statistics.get("skipped_steps", 0)

        # 存储完整结果
        execution.result_data = raw_result

        # 提取错误信息
        error_info = self.extract_error_info(raw_result)
        if error_info:
            execution.error_message = error_info.get("message")
            execution.error_type = error_info.get("type")
            execution.error_category = error_info.get("category")

        # 提取并存储步骤结果
        await self._process_step_results(execution_id, raw_result, session)

        # 保存到数据库
        await session.commit()

    def extract_statistics(self, raw_result: Dict[str, Any]) -> Dict[str, int]:
        """
        提取统计信息

        Args:
            raw_result: API Engine 返回的原始结果

        Returns:
            统计信息字典
        """
        statistics = raw_result.get("statistics", {})

        return {
            "total_steps": statistics.get("total_steps", 0),
            "passed_steps": statistics.get("passed_steps", 0),
            "failed_steps": statistics.get("failed_steps", 0),
            "skipped_steps": statistics.get("skipped_steps", 0),
        }

    def extract_performance_metrics(self, raw_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        提取性能指标

        Args:
            raw_result: API Engine 返回的原始结果

        Returns:
            性能指标列表（每个步骤一个）
        """
        metrics_list = []
        steps = raw_result.get("steps", [])

        for step in steps:
            performance = step.get("performance", {})
            if performance:
                metrics_list.append({
                    "step_name": step.get("name", ""),
                    "total_time": performance.get("total_time", 0),
                    "dns_time": performance.get("dns_time", 0),
                    "tcp_time": performance.get("tcp_time", 0),
                    "tls_time": performance.get("tls_time", 0),
                    "server_time": performance.get("server_time", 0),
                    "download_time": performance.get("download_time", 0),
                    "size": performance.get("size", 0),
                })

        return metrics_list

    def extract_error_info(self, raw_result: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        提取错误信息

        Args:
            raw_result: API Engine 返回的原始结果

        Returns:
            错误信息字典，如果没有错误则返回 None
        """
        # 检查顶层错误信息
        error_info = raw_result.get("error_info")
        if error_info:
            return {
                "type": error_info.get("type"),
                "category": error_info.get("category"),
                "message": error_info.get("message"),
            }

        # 检查测试用例状态
        test_case_info = raw_result.get("test_case", {})
        status = test_case_info.get("status", "")

        if status in ["failed", "error"]:
            # 查找第一个失败的步骤
            steps = raw_result.get("steps", [])
            for step in steps:
                if step.get("status") in ["failed", "error"]:
                    step_error = step.get("error_info")
                    if step_error:
                        return {
                            "type": step_error.get("type"),
                            "category": step_error.get("category"),
                            "message": f"步骤 '{step.get('name')}' 失败: {step_error.get('message')}",
                        }

        return None

    async def _process_step_results(
        self,
        execution_id: int,
        raw_result: Dict[str, Any],
        session: AsyncSession
    ) -> None:
        """
        处理并存储步骤结果

        Args:
            execution_id: 执行记录 ID
            raw_result: API Engine 返回的原始结果
            session: 数据库会话
        """
        steps = raw_result.get("steps", [])

        for index, step in enumerate(steps):
            step_result = ApiTestStepResult(
                execution_id=execution_id,
                step_name=step.get("name", ""),
                step_order=index,
                step_type=self._infer_step_type(step),
                status=self._map_step_status(step.get("status", "error")),
            )

            # 时间信息
            if step.get("start_time"):
                step_result.started_at = self._parse_datetime(step["start_time"])

            if step.get("end_time"):
                step_result.completed_at = self._parse_datetime(step["end_time"])

            step_result.duration = step.get("retry_count", 0)
            step_result.retry_count = step.get("retry_count", 0)

            # 性能指标
            step_result.performance_metrics = step.get("performance", {})

            # 响应数据
            step_result.response_data = step.get("response", {})

            # 验证结果
            step_result.validations = step.get("validations", [])

            # 提取的变量
            step_result.extracted_vars = step.get("extracted_vars", {})

            # 错误信息
            if step.get("error_info"):
                step_result.error_info = step["error_info"]

            # 添加到数据库
            session.add(step_result)

    def _infer_step_type(self, step: Dict[str, Any]) -> str:
        """
        推断步骤类型

        Args:
            step: 步骤数据

        Returns:
            步骤类型
        """
        # 从响应数据推断
        response = step.get("response", {})
        if response.get("request"):
            return "request"
        elif response.get("sql"):
            return "database"

        # 默认返回 unknown
        return "unknown"

    def _map_status(self, status: str) -> str:
        """
        映射状态值

        Args:
            status: API Engine 返回的状态

        Returns:
            数据库中的状态值
        """
        status_mapping = {
            "passed": "passed",
            "failed": "failed",
            "skipped": "skipped",
            "error": "error",
            "running": "running",
            "pending": "pending",
        }
        return status_mapping.get(status, "error")

    def _map_step_status(self, status: str) -> str:
        """
        映射步骤状态值

        Args:
            status: API Engine 返回的步骤状态

        Returns:
            数据库中的步骤状态值
        """
        status_mapping = {
            "success": "success",
            "failed": "failed",
            "skipped": "skipped",
            "error": "error",
        }
        return status_mapping.get(status, "error")

    def _parse_datetime(self, datetime_str: str) -> Optional[datetime]:
        """
        解析 datetime 字符串

        Args:
            datetime_str: ISO 8601 格式的 datetime 字符串

        Returns:
            datetime 对象，解析失败返回 None
        """
        try:
            # 处理带时区的格式
            if 'T' in datetime_str:
                return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
            else:
                return datetime.fromisoformat(datetime_str)
        except (ValueError, AttributeError):
            return None


# 便捷函数
async def process_test_result(
    execution_id: int,
    raw_result: Dict[str, Any],
    session: AsyncSession
) -> None:
    """
    处理测试结果（便捷函数）

    Args:
        execution_id: 执行记录 ID
        raw_result: API Engine 返回的原始结果
        session: 数据库会话
    """
    processor = TestResultProcessor()
    await processor.process_result(execution_id, raw_result, session)
