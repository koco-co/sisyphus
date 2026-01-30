"""
测试结果处理器单元测试
"""

import pytest
from datetime import datetime
from app.services.test_result_processor import (
    TestResultProcessor,
    process_test_result
)
from app.models.api_test_case import ApiTestExecution, ApiTestStepResult


class TestTestResultProcessor:
    """测试结果处理器测试类"""

    def setup_method(self):
        """测试前准备"""
        self.processor = TestResultProcessor()
        self.sample_result = {
            "test_case": {
                "name": "测试用例",
                "status": "failed",  # 改为 failed 以测试错误提取
                "start_time": "2026-01-30T12:00:00.000000",
                "end_time": "2026-01-30T12:00:07.537636",
                "duration": 7.537636
            },
            "statistics": {
                "total_steps": 7,
                "passed_steps": 7,
                "failed_steps": 0,
                "skipped_steps": 0,
                "pass_rate": 100.0
            },
            "steps": [
                {
                    "name": "步骤1",
                    "status": "success",
                    "start_time": "2026-01-30T12:00:00.000000",
                    "end_time": "2026-01-30T12:00:01.050000",
                    "retry_count": 0,
                    "performance": {
                        "total_time": 1048.72,
                        "dns_time": 100,
                        "tcp_time": 100,
                        "tls_time": 150,
                        "server_time": 419.49,
                        "download_time": 0,
                        "size": 396
                    },
                    "response": {
                        "status_code": 200,
                        "url": "https://httpbin.org/get",
                        "body": {"code": 0}
                    },
                    "validations": [
                        {
                            "passed": True,
                            "type": "status_code",
                            "expect": "200"
                        }
                    ],
                    "extracted_vars": {
                        "token": "abc123"
                    }
                },
                {
                    "name": "步骤2",
                    "status": "failed",
                    "start_time": "2026-01-30T12:00:01.050000",
                    "end_time": "2026-01-30T12:00:02.100000",
                    "error_info": {
                        "type": "AssertionError",
                        "category": "assertion",
                        "message": "Expected 0, but got 1001"
                    }
                }
            ],
            "final_variables": {
                "token": "abc123"
            }
        }

    def test_extract_statistics(self):
        """测试提取统计信息"""
        stats = self.processor.extract_statistics(self.sample_result)

        assert stats["total_steps"] == 7
        assert stats["passed_steps"] == 7
        assert stats["failed_steps"] == 0
        assert stats["skipped_steps"] == 0

    def test_extract_statistics_empty(self):
        """测试提取空结果的统计信息"""
        empty_result = {}
        stats = self.processor.extract_statistics(empty_result)

        assert stats["total_steps"] == 0
        assert stats["passed_steps"] == 0
        assert stats["failed_steps"] == 0
        assert stats["skipped_steps"] == 0

    def test_extract_performance_metrics(self):
        """测试提取性能指标"""
        metrics = self.processor.extract_performance_metrics(self.sample_result)

        # 只有步骤1有performance字段，步骤2没有
        assert len(metrics) == 1

        # 验证第一个步骤的性能指标
        assert metrics[0]["step_name"] == "步骤1"
        assert metrics[0]["total_time"] == 1048.72
        assert metrics[0]["dns_time"] == 100
        assert metrics[0]["tcp_time"] == 100
        assert metrics[0]["tls_time"] == 150
        assert metrics[0]["server_time"] == 419.49
        assert metrics[0]["size"] == 396

    def test_extract_performance_metrics_empty(self):
        """测试提取空结果的性能指标"""
        empty_result = {"steps": []}
        metrics = self.processor.extract_performance_metrics(empty_result)

        assert len(metrics) == 0

    def test_extract_error_info_from_top_level(self):
        """测试从顶层提取错误信息"""
        result_with_error = {
            "test_case": {"status": "failed"},
            "error_info": {
                "type": "AssertionError",
                "category": "assertion",
                "message": "测试失败"
            }
        }

        error_info = self.processor.extract_error_info(result_with_error)

        assert error_info is not None
        assert error_info["type"] == "AssertionError"
        assert error_info["category"] == "assertion"
        assert error_info["message"] == "测试失败"

    def test_extract_error_info_from_failed_step(self):
        """测试从失败步骤提取错误信息"""
        error_info = self.processor.extract_error_info(self.sample_result)

        assert error_info is not None
        assert error_info["type"] == "AssertionError"
        assert error_info["category"] == "assertion"
        assert "步骤2" in error_info["message"]

    def test_extract_error_info_no_error(self):
        """测试没有错误时返回 None"""
        success_result = {
            "test_case": {"status": "passed"},
            "steps": [
                {
                    "name": "成功步骤",
                    "status": "success"
                }
            ]
        }

        error_info = self.processor.extract_error_info(success_result)

        assert error_info is None

    def test_map_status(self):
        """测试状态映射"""
        assert self.processor._map_status("passed") == "passed"
        assert self.processor._map_status("failed") == "failed"
        assert self.processor._map_status("skipped") == "skipped"
        assert self.processor._map_status("error") == "error"
        assert self.processor._map_status("unknown") == "error"

    def test_map_step_status(self):
        """测试步骤状态映射"""
        assert self.processor._map_step_status("success") == "success"
        assert self.processor._map_step_status("failed") == "failed"
        assert self.processor._map_step_status("skipped") == "skipped"
        assert self.processor._map_step_status("error") == "error"
        assert self.processor._map_step_status("unknown") == "error"

    def test_infer_step_type_request(self):
        """测试推断请求步骤类型"""
        step = {
            "response": {
                "request": {
                    "method": "GET"
                }
            }
        }

        step_type = self.processor._infer_step_type(step)
        assert step_type == "request"

    def test_infer_step_type_unknown(self):
        """测试推断未知步骤类型"""
        step = {}

        step_type = self.processor._infer_step_type(step)
        assert step_type == "unknown"

    def test_parse_datetime_success(self):
        """测试解析 datetime 字符串成功"""
        datetime_str = "2026-01-30T12:00:00.000000"
        result = self.processor._parse_datetime(datetime_str)

        assert result is not None
        assert isinstance(result, datetime)
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 30

    def test_parse_datetime_with_timezone(self):
        """测试解析带时区的 datetime 字符串"""
        datetime_str = "2026-01-30T12:00:00.000000Z"
        result = self.processor._parse_datetime(datetime_str)

        assert result is not None
        assert isinstance(result, datetime)

    def test_parse_datetime_invalid(self):
        """测试解析无效的 datetime 字符串"""
        invalid_datetime = "invalid-datetime"
        result = self.processor._parse_datetime(invalid_datetime)

        assert result is None

    def test_convenience_function(self):
        """测试便捷函数存在且可调用"""
        from app.services.test_result_processor import process_test_result
        assert callable(process_test_result)


class TestProcessResultAsync:
    """异步处理测试类"""

    @pytest.mark.skip(reason="需要 pytest-mock 和 pytest-asyncio 插件")
    async def test_process_result_with_mock_session(self, mocker):
        """测试使用 mock session 处理结果"""
        # 创建 mock session 和 execution
        mock_session = mocker.MagicMock()
        mock_execution = mocker.MagicMock()
        mock_execution.id = 1

        # Mock session.get
        mock_session.get.return_value = mock_execution

        # 处理结果
        processor = TestResultProcessor()
        await processor.process_result(1, self.sample_result, mock_session)

        # 验证 execution 被更新
        assert mock_session.get.called
        assert mock_session.commit.called

        # 验证基本属性被设置
        assert mock_execution.status == "failed"  # 修改为 failed
        assert mock_execution.total_steps == 7
        assert mock_execution.passed_steps == 7


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
