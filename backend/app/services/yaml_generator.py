"""
YAML 生成器 - 将结构化数据转换为 Sisyphus-api-engine YAML 格式
"""

import yaml
from typing import Dict, Any, List
from datetime import datetime


class YAMLGenerator:
    """YAML 生成器 - 将前端传来的结构化配置转换为 YAML 格式"""

    def __init__(self):
        """初始化 YAML 生成器"""
        # 支持的步骤类型
        self.supported_step_types = [
            "request",    # HTTP/HTTPS 请求
            "database",   # 数据库操作
            "wait",       # 等待/延迟
            "loop",       # 循环控制
            "script",     # 脚本执行
            "concurrent"  # 并发执行
        ]

    def generate_yaml(self, test_case_config: Dict[str, Any]) -> str:
        """
        将结构化配置转换为 YAML 格式

        Args:
            test_case_config: 测试用例配置
                {
                    "name": "测试用例名称",
                    "description": "描述",
                    "config": {
                        "profiles": {...},
                        "variables": {...},
                        "timeout": 30
                    },
                    "steps": [...],
                    "tags": [...],
                    "enabled": True
                }

        Returns:
            YAML 格式的字符串

        Raises:
            ValueError: 配置格式不正确
        """
        # 验证必需字段
        self._validate_config(test_case_config)

        # 构建 YAML 数据结构
        yaml_data = {
            "name": test_case_config.get("name", ""),
            "description": test_case_config.get("description", ""),
            "config": self._build_config(test_case_config.get("config", {})),
            "steps": self._build_steps(test_case_config.get("steps", [])),
        }

        # 添加可选字段
        if "tags" in test_case_config:
            yaml_data["tags"] = test_case_config["tags"]

        if "enabled" in test_case_config:
            yaml_data["enabled"] = test_case_config["enabled"]

        # 转换为 YAML 字符串
        yaml_content = yaml.dump(
            yaml_data,
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
            indent=2
        )

        return yaml_content

    def _validate_config(self, config: Dict[str, Any]) -> None:
        """
        验证配置格式

        Args:
            config: 配置字典

        Raises:
            ValueError: 配置格式不正确
        """
        if not isinstance(config, dict):
            raise ValueError("配置必须是字典类型")

        if "name" not in config:
            raise ValueError("缺少必需字段: name")

        if "steps" not in config:
            raise ValueError("缺少必需字段: steps")

        if not isinstance(config["steps"], list):
            raise ValueError("steps 必须是列表类型")

    def _build_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        构建配置部分

        Args:
            config: 原始配置

        Returns:
            处理后的配置
        """
        result = {}

        # 添加配置名称（可选）
        if "name" in config:
            result["name"] = config["name"]

        # 添加超时配置（可选）
        if "timeout" in config:
            result["timeout"] = config["timeout"]

        # 添加重试次数（可选）
        if "retry_times" in config:
            result["retry_times"] = config["retry_times"]

        # 添加环境配置（可选）
        if "profiles" in config:
            result["profiles"] = config["profiles"]

            # 添加当前激活的环境
            if "active_profile" in config:
                result["active_profile"] = config["active_profile"]

        # 添加全局变量（可选）
        if "variables" in config:
            result["variables"] = config["variables"]

        # 添加数据驱动配置（可选）
        if "data_source" in config:
            result["data_source"] = config["data_source"]

            if "data_iterations" in config:
                result["data_iterations"] = config["data_iterations"]

            if "variable_prefix" in config:
                result["variable_prefix"] = config["variable_prefix"]

        return result

    def _build_steps(self, steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        构建步骤列表

        Args:
            steps: 原始步骤列表

        Returns:
            处理后的步骤列表
        """
        result = []

        for step in steps:
            if not isinstance(step, dict):
                continue

            # 验证步骤类型
            step_type = step.get("type", "request")
            if step_type not in self.supported_step_types:
                raise ValueError(f"不支持的步骤类型: {step_type}")

            # 构建步骤
            built_step = self._build_single_step(step)
            result.append(built_step)

        return result

    def _build_single_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """
        构建单个步骤

        Args:
            step: 单个步骤配置

        Returns:
            处理后的步骤
        """
        result = {
            "name": step.get("name", ""),
        }

        # 添加描述（可选）
        if "description" in step:
            result["description"] = step["description"]

        # 添加步骤类型
        step_type = step.get("type", "request")
        result["type"] = step_type

        # 根据步骤类型构建不同配置
        if step_type == "request":
            result.update(self._build_request_step(step))
        elif step_type == "database":
            result.update(self._build_database_step(step))
        elif step_type == "wait":
            result.update(self._build_wait_step(step))
        elif step_type == "loop":
            result.update(self._build_loop_step(step))
        elif step_type == "script":
            result.update(self._build_script_step(step))
        elif step_type == "concurrent":
            result.update(self._build_concurrent_step(step))

        # 添加验证规则（可选）
        if "validations" in step:
            result["validations"] = self._build_validations(step["validations"])

        # 添加变量提取器（可选）
        if "extractors" in step:
            result["extractors"] = self._build_extractors(step["extractors"])

        # 添加重试策略（可选）
        if "retry_policy" in step:
            result["retry_policy"] = step["retry_policy"]
        elif "retry_times" in step:
            result["retry_times"] = step["retry_times"]

        # 添加步骤控制（可选）
        if "skip_if" in step:
            result["skip_if"] = step["skip_if"]

        if "only_if" in step:
            result["only_if"] = step["only_if"]

        if "depends_on" in step:
            result["depends_on"] = step["depends_on"]

        # 添加超时配置（可选）
        if "timeout" in step:
            result["timeout"] = step["timeout"]

        return result

    def _build_request_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """构建 HTTP 请求步骤"""
        result = {}

        # 添加 HTTP 方法
        if "method" in step:
            result["method"] = step["method"]

        # 添加 URL
        if "url" in step:
            result["url"] = step["url"]

        # 添加请求参数（可选）
        if "params" in step:
            result["params"] = step["params"]

        # 添加请求头（可选）
        if "headers" in step:
            result["headers"] = step["headers"]

        # 添加请求体（可选）
        if "body" in step:
            result["body"] = step["body"]

        # 添加 Cookies（可选）
        if "cookies" in step:
            result["cookies"] = step["cookies"]

        return result

    def _build_database_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """构建数据库操作步骤"""
        result = {}

        # 添加数据库连接名称
        if "database" in step:
            result["database"] = step["database"]

        # 添加操作类型
        if "operation" in step:
            result["operation"] = step["operation"]

        # 添加 SQL 语句
        if "sql" in step:
            result["sql"] = step["sql"]

        # 添加参数（可选）
        if "params" in step:
            result["params"] = step["params"]

        return result

    def _build_wait_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """构建等待步骤"""
        result = {}

        # 添加等待类型
        if "wait_type" in step:
            result["wait_type"] = step["wait_type"]

        # 添加固定延迟时间（可选）
        if "duration" in step:
            result["duration"] = step["duration"]

        # 添加条件等待（可选）
        if "condition" in step:
            result["condition"] = step["condition"]

        # 添加检查间隔（可选）
        if "interval" in step:
            result["interval"] = step["interval"]

        # 添加最大等待时间（可选）
        if "max_wait" in step:
            result["max_wait"] = step["max_wait"]

        return result

    def _build_loop_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """构建循环步骤"""
        result = {}

        # 添加循环类型
        if "loop_type" in step:
            result["loop_type"] = step["loop_type"]

        # 添加循环次数（for 循环）
        if "loop_count" in step:
            result["loop_count"] = step["loop_count"]

        # 添加循环条件（while 循环）
        if "loop_condition" in step:
            result["loop_condition"] = step["loop_condition"]

        # 添加循环变量名（可选）
        if "loop_variable" in step:
            result["loop_variable"] = step["loop_variable"]

        # 添加循环步骤
        if "loop_steps" in step:
            result["loop_steps"] = self._build_steps(step["loop_steps"])

        return result

    def _build_script_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """构建脚本执行步骤"""
        result = {}

        # 添加脚本内容
        if "script" in step:
            result["script"] = step["script"]

        # 添加脚本类型（可选）
        if "script_type" in step:
            result["script_type"] = step["script_type"]

        # 添加是否允许导入（可选）
        if "allow_imports" in step:
            result["allow_imports"] = step["allow_imports"]

        return result

    def _build_concurrent_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """构建并发执行步骤"""
        result = {}

        # 添加并发数
        if "concurrency" in step:
            result["concurrency"] = step["concurrency"]

        # 添加并发步骤
        if "concurrent_steps" in step:
            result["concurrent_steps"] = self._build_steps(step["concurrent_steps"])

        return result

    def _build_validations(self, validations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        构建验证规则列表

        Args:
            validations: 验证规则列表

        Returns:
            处理后的验证规则列表
        """
        result = []

        for validation in validations:
            if not isinstance(validation, dict):
                continue

            built_validation = {
                "type": validation.get("type", "eq"),
            }

            # 添加 JSONPath 路径（可选）
            if "path" in validation:
                built_validation["path"] = validation["path"]

            # 添加期望值
            if "expect" in validation:
                built_validation["expect"] = validation["expect"]

            # 添加描述（可选）
            if "description" in validation:
                built_validation["description"] = validation["description"]

            result.append(built_validation)

        return result

    def _build_extractors(self, extractors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        构建变量提取器列表

        Args:
            extractors: 提取器列表

        Returns:
            处理后的提取器列表
        """
        result = []

        for extractor in extractors:
            if not isinstance(extractor, dict):
                continue

            built_extractor = {
                "type": extractor.get("type", "jsonpath"),
                "name": extractor.get("name", ""),
            }

            # 添加 JSONPath 路径
            if "path" in extractor:
                built_extractor["path"] = extractor["path"]

            # 添加描述（可选）
            if "description" in extractor:
                built_extractor["description"] = extractor["description"]

            result.append(built_extractor)

        return result

    def validate_yaml(self, yaml_content: str) -> bool:
        """
        验证 YAML 格式是否正确

        Args:
            yaml_content: YAML 内容

        Returns:
            True 如果格式正确，False 否则
        """
        try:
            yaml.safe_load(yaml_content)
            return True
        except yaml.YAMLError:
            return False


# 便捷函数
def generate_yaml_from_config(config: Dict[str, Any]) -> str:
    """
    从配置生成 YAML（便捷函数）

    Args:
        config: 测试用例配置

    Returns:
        YAML 格式字符串
    """
    generator = YAMLGenerator()
    return generator.generate_yaml(config)
