"""
YAML 生成器单元测试
"""

import pytest
import yaml
from app.services.yaml_generator import YAMLGenerator, generate_yaml_from_config


class TestYAMLGenerator:
    """YAML 生成器测试类"""

    def setup_method(self):
        """测试前准备"""
        self.generator = YAMLGenerator()

    def test_generate_basic_request_test(self):
        """测试生成基本的 HTTP 请求测试用例"""
        config = {
            "name": "测试GET请求",
            "description": "测试基本的GET请求",
            "config": {
                "profiles": {
                    "dev": {
                        "base_url": "https://httpbin.org"
                    }
                },
                "active_profile": "dev"
            },
            "steps": [
                {
                    "name": "GET请求示例",
                    "type": "request",
                    "method": "GET",
                    "url": "${config.profiles.dev.base_url}/get",
                    "validations": [
                        {
                            "type": "status_code",
                            "path": "$.status_code",
                            "expect": "200",
                            "description": "验证状态码为200"
                        }
                    ]
                }
            ],
            "tags": ["基础", "http"],
            "enabled": True
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证 YAML 格式
        assert self.generator.validate_yaml(yaml_content)

        # 解析并验证内容
        parsed = yaml.safe_load(yaml_content)
        assert parsed["name"] == "测试GET请求"
        assert parsed["description"] == "测试基本的GET请求"
        assert len(parsed["steps"]) == 1
        assert parsed["steps"][0]["type"] == "request"
        assert parsed["steps"][0]["method"] == "GET"
        assert len(parsed["steps"][0]["validations"]) == 1

    def test_generate_post_request_with_body(self):
        """测试生成带请求体的 POST 请求"""
        config = {
            "name": "测试POST请求",
            "config": {
                "variables": {
                    "username": "testuser",
                    "password": "testpass"
                }
            },
            "steps": [
                {
                    "name": "POST请求示例",
                    "type": "request",
                    "method": "POST",
                    "url": "https://httpbin.org/post",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "body": {
                        "username": "${username}",
                        "password": "${password}"
                    },
                    "validations": [
                        {
                            "type": "eq",
                            "path": "$.json.username",
                            "expect": "testuser"
                        }
                    ]
                }
            ]
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证 YAML 格式
        assert self.generator.validate_yaml(yaml_content)

        # 解析并验证内容
        parsed = yaml.safe_load(yaml_content)
        step = parsed["steps"][0]
        assert step["method"] == "POST"
        assert step["body"]["username"] == "${username}"
        assert "headers" in step

    def test_generate_multiple_steps(self):
        """测试生成多步骤测试用例"""
        config = {
            "name": "多步骤测试",
            "config": {},
            "steps": [
                {
                    "name": "步骤1",
                    "type": "request",
                    "method": "GET",
                    "url": "https://httpbin.org/get"
                },
                {
                    "name": "步骤2",
                    "type": "request",
                    "method": "POST",
                    "url": "https://httpbin.org/post"
                },
                {
                    "name": "步骤3",
                    "type": "wait",
                    "wait_type": "delay",
                    "duration": 2.0
                }
            ]
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证步骤数量
        parsed = yaml.safe_load(yaml_content)
        assert len(parsed["steps"]) == 3
        assert parsed["steps"][0]["type"] == "request"
        assert parsed["steps"][1]["type"] == "request"
        assert parsed["steps"][2]["type"] == "wait"

    def test_generate_with_extractors(self):
        """测试生成带变量提取器的测试用例"""
        config = {
            "name": "变量提取测试",
            "config": {},
            "steps": [
                {
                    "name": "登录并提取token",
                    "type": "request",
                    "method": "POST",
                    "url": "https://httpbin.org/post",
                    "body": {
                        "username": "testuser"
                    },
                    "extractors": [
                        {
                            "type": "jsonpath",
                            "name": "access_token",
                            "path": "$.data.token",
                            "description": "提取访问令牌"
                        },
                        {
                            "type": "jsonpath",
                            "name": "user_id",
                            "path": "$.data.user.id"
                        }
                    ],
                    "validations": [
                        {
                            "type": "status_code",
                            "path": "$.status_code",
                            "expect": "200"
                        }
                    ]
                }
            ]
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证提取器
        parsed = yaml.safe_load(yaml_content)
        step = parsed["steps"][0]
        assert len(step["extractors"]) == 2
        assert step["extractors"][0]["name"] == "access_token"
        assert step["extractors"][1]["name"] == "user_id"

    def test_validate_config_missing_name(self):
        """测试验证配置缺少名称"""
        config = {
            "description": "测试",
            "steps": []
        }

        with pytest.raises(ValueError, match="缺少必需字段: name"):
            self.generator.generate_yaml(config)

    def test_validate_config_missing_steps(self):
        """测试验证配置缺少步骤"""
        config = {
            "name": "测试"
        }

        with pytest.raises(ValueError, match="缺少必需字段: steps"):
            self.generator.generate_yaml(config)

    def test_unsupported_step_type(self):
        """测试不支持的步骤类型"""
        config = {
            "name": "测试",
            "steps": [
                {
                    "name": "未知步骤",
                    "type": "unknown_type"
                }
            ]
        }

        with pytest.raises(ValueError, match="不支持的步骤类型"):
            self.generator.generate_yaml(config)

    def test_convenience_function(self):
        """测试便捷函数"""
        config = {
            "name": "便捷函数测试",
            "config": {},
            "steps": [
                {
                    "name": "简单请求",
                    "type": "request",
                    "method": "GET",
                    "url": "https://httpbin.org/get"
                }
            ]
        }

        yaml_content = generate_yaml_from_config(config)

        assert self.generator.validate_yaml(yaml_content)
        parsed = yaml.safe_load(yaml_content)
        assert parsed["name"] == "便捷函数测试"

    def test_generate_with_retry_policy(self):
        """测试生成带重试策略的测试用例"""
        config = {
            "name": "重试测试",
            "config": {},
            "steps": [
                {
                    "name": "可能失败的请求",
                    "type": "request",
                    "method": "GET",
                    "url": "https://httpbin.org/get",
                    "retry_policy": {
                        "max_attempts": 3,
                        "strategy": "exponential",
                        "base_delay": 1.0,
                        "max_delay": 10.0
                    },
                    "validations": [
                        {
                            "type": "status_code",
                            "expect": "200"
                        }
                    ]
                }
            ]
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证重试策略
        parsed = yaml.safe_load(yaml_content)
        step = parsed["steps"][0]
        assert "retry_policy" in step
        assert step["retry_policy"]["max_attempts"] == 3
        assert step["retry_policy"]["strategy"] == "exponential"

    def test_generate_with_step_controls(self):
        """测试生成带步骤控制的测试用例"""
        config = {
            "name": "步骤控制测试",
            "config": {},
            "steps": [
                {
                    "name": "条件跳过步骤",
                    "type": "request",
                    "method": "GET",
                    "url": "https://httpbin.org/get",
                    "skip_if": "${config.env} == 'production'"
                },
                {
                    "name": "条件执行步骤",
                    "type": "request",
                    "method": "GET",
                    "url": "https://httpbin.org/get",
                    "only_if": "${feature_enabled} == true"
                },
                {
                    "name": "依赖步骤",
                    "type": "request",
                    "method": "GET",
                    "url": "https://httpbin.org/get",
                    "depends_on": ["步骤1", "步骤2"]
                }
            ]
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证步骤控制
        parsed = yaml.safe_load(yaml_content)
        assert "skip_if" in parsed["steps"][0]
        assert "only_if" in parsed["steps"][1]
        assert "depends_on" in parsed["steps"][2]

    def test_generate_wait_step(self):
        """测试生成等待步骤"""
        config = {
            "name": "等待测试",
            "config": {},
            "steps": [
                {
                    "name": "固定延迟",
                    "type": "wait",
                    "wait_type": "delay",
                    "duration": 2.0
                },
                {
                    "name": "条件等待",
                    "type": "wait",
                    "condition": "${response.status} == 'completed'",
                    "interval": 1.0,
                    "max_wait": 30.0
                }
            ]
        }

        yaml_content = self.generator.generate_yaml(config)

        # 验证等待步骤
        parsed = yaml.safe_load(yaml_content)
        assert parsed["steps"][0]["type"] == "wait"
        assert parsed["steps"][0]["duration"] == 2.0
        assert parsed["steps"][1]["condition"] == "${response.status} == 'completed'"

    def test_validate_yaml_method(self):
        """测试 validate_yaml 方法"""
        # 有效的 YAML
        valid_yaml = """
name: "测试"
steps:
  - name: "步骤1"
    type: request
"""
        assert self.generator.validate_yaml(valid_yaml) is True

        # 无效的 YAML
        invalid_yaml = """
name: "测试
steps: [
"""
        assert self.generator.validate_yaml(invalid_yaml) is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
