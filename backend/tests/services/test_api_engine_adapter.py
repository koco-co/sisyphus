"""
API Engine 适配器单元测试
使用 mock 模拟命令执行
"""

import pytest
from unittest.mock import patch, MagicMock
import json
from app.services.api_engine_adapter import APIEngineAdapter, execute_test_case


class TestAPIEngineAdapter:
    """API Engine 适配器测试类"""

    def setup_method(self):
        """测试前准备"""
        self.adapter = APIEngineAdapter()

    def test_check_engine_installed(self):
        """测试检查引擎是否已安装"""
        with patch('subprocess.run') as mock_run:
            # 引擎已安装
            mock_run.return_value = MagicMock(returncode=0)
            assert self.adapter._check_engine_installed() is True

            # 引擎未安装
            mock_run.return_value = MagicMock(returncode=1)
            assert self.adapter._check_engine_installed() is False

    @patch('subprocess.run')
    def test_execute_test_case_success(self, mock_run):
        """测试成功执行测试用例"""
        # 模拟命令执行成功
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='{"test_case": {"name": "测试", "status": "passed"}}'
        )

        # 模拟 which 命令
        with patch.object(self.adapter, '_check_engine_installed', return_value=True):
            yaml_content = """
name: "测试"
steps:
  - name: "步骤1"
    type: request
    method: GET
    url: "https://httpbin.org/get"
"""

            result = self.adapter.execute_test_case(yaml_content)

            # 验证返回结果
            assert result["test_case"]["name"] == "测试"
            assert result["test_case"]["status"] == "passed"

    @patch('subprocess.run')
    def test_execute_test_case_with_environment(self, mock_run):
        """测试使用环境参数执行测试用例"""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='{"test_case": {"status": "passed"}}'
        )

        with patch.object(self.adapter, '_check_engine_installed', return_value=True):
            yaml_content = "name: 测试\nsteps: []"

            result = self.adapter.execute_test_case(
                yaml_content,
                environment="prod"
            )

            # 验证命令包含 --profile prod
            assert result is not None
            # 检查调用参数
            call_args = mock_run.call_args
            cmd = call_args[0][0]
            assert "--profile" in cmd
            assert "prod" in cmd

    @patch('subprocess.run')
    def test_execute_test_case_engine_not_found(self, mock_run):
        """测试引擎未安装的情况"""
        # 模拟 which 命令返回未找到
        with patch.object(self.adapter, '_check_engine_installed', return_value=False):
            yaml_content = "name: 测试\nsteps: []"

            with pytest.raises(FileNotFoundError, match="sisyphus-api-engine 未安装"):
                self.adapter.execute_test_case(yaml_content)

    @patch('subprocess.run')
    def test_execute_test_case_command_failed(self, mock_run):
        """测试命令执行失败"""
        # 模拟命令执行失败
        mock_run.return_value = MagicMock(
            returncode=1,
            stderr="YAML 语法错误"
        )

        with patch.object(self.adapter, '_check_engine_installed', return_value=True):
            yaml_content = "invalid: yaml: content: ["

            with pytest.raises(RuntimeError, match="执行失败"):
                self.adapter.execute_test_case(yaml_content)

    @patch('subprocess.run')
    def test_execute_test_case_timeout(self, mock_run):
        """测试执行超时"""
        # 模拟超时异常
        from subprocess import TimeoutExpired
        mock_run.side_effect = TimeoutExpired("cmd", 300)

        with patch.object(self.adapter, '_check_engine_installed', return_value=True):
            yaml_content = "name: 测试\nsteps: []"

            with pytest.raises(RuntimeError, match="执行超时"):
                self.adapter.execute_test_case(yaml_content)

    def test_create_temp_file(self):
        """测试创建临时文件"""
        content = "name: 测试\nsteps: []"
        temp_file = self.adapter._create_temp_file(content)

        try:
            # 验证文件存在
            import os
            assert os.path.exists(temp_file)

            # 验证文件内容
            with open(temp_file, 'r', encoding='utf-8') as f:
                assert f.read() == content

        finally:
            # 清理
            import os
            if os.path.exists(temp_file):
                os.remove(temp_file)

    def test_build_command(self):
        """测试构建命令"""
        yaml_file = "/tmp/test.yaml"

        # 基本命令
        cmd = self.adapter._build_command(yaml_file)
        assert "sisyphus-api-engine" in cmd
        assert "--cases" in cmd
        assert yaml_file in cmd

        # 带环境参数
        cmd = self.adapter._build_command(yaml_file, environment="dev")
        assert "--profile" in cmd
        assert "dev" in cmd

        # 带输出格式
        cmd = self.adapter._build_command(yaml_file, output_format="csv")
        assert "--format" in cmd
        assert "csv" in cmd

        # 详细模式
        cmd = self.adapter._build_command(yaml_file, verbose=True)
        assert "-v" in cmd

    def test_parse_json_output(self):
        """测试解析 JSON 输出"""
        json_str = '{"test_case": {"name": "测试"}}'
        result = self.adapter._parse_json_output(json_str)

        assert result["test_case"]["name"] == "测试"

    def test_parse_json_output_invalid(self):
        """测试解析无效的 JSON"""
        invalid_json = "{invalid json}"

        with pytest.raises(ValueError, match="JSON 解析失败"):
            self.adapter._parse_json_output(invalid_json)

    def test_get_output_file_path(self):
        """测试获取输出文件路径"""
        yaml_file = "/tmp/test.yaml"

        # JSON 格式
        output_file = self.adapter._get_output_file_path(yaml_file, "json")
        assert output_file == "/tmp/test.json"

        # CSV 格式
        output_file = self.adapter._get_output_file_path(yaml_file, "csv")
        assert output_file == "/tmp/test.csv"

        # HTML 格式
        output_file = self.adapter._get_output_file_path(yaml_file, "html")
        assert output_file == "/tmp/test.html"

    def test_read_output_file_not_found(self):
        """测试读取不存在的输出文件"""
        with pytest.raises(FileNotFoundError, match="输出文件不存在"):
            self.adapter._read_output_file("/nonexistent/file.json", "json")

    @patch('subprocess.run')
    def test_validate_yaml_success(self, mock_run):
        """测试验证 YAML 成功"""
        mock_run.return_value = MagicMock(returncode=0)

        yaml_content = "name: 测试\nsteps: []"
        result = self.adapter.validate_yaml(yaml_content)

        assert result is True

    @patch('subprocess.run')
    def test_validate_yaml_failure(self, mock_run):
        """测试验证 YAML 失败"""
        mock_run.return_value = MagicMock(returncode=1)

        yaml_content = "invalid: yaml: ["
        result = self.adapter.validate_yaml(yaml_content)

        assert result is False

    @patch('subprocess.run')
    def test_get_engine_version(self, mock_run):
        """测试获取引擎版本"""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Sisyphus API Engine v1.0.2"
        )

        version = self.adapter.get_engine_version()

        assert version == "Sisyphus API Engine v1.0.2"

    @patch('subprocess.run')
    def test_get_engine_version_failure(self, mock_run):
        """测试获取引擎版本失败"""
        mock_run.return_value = MagicMock(returncode=1)

        version = self.adapter.get_engine_version()

        assert version is None

    def test_convenience_function(self):
        """测试便捷函数"""
        with patch.object(APIEngineAdapter, 'execute_test_case') as mock_execute:
            mock_execute.return_value = {"test_case": {"status": "passed"}}

            yaml_content = "name: 测试\nsteps: []"
            result = execute_test_case(yaml_content)

            assert result["test_case"]["status"] == "passed"
            mock_execute.assert_called_once()


class TestAPIEngineAdapterIntegration:
    """集成测试类（需要实际安装 sisyphus-api-engine）"""

    @pytest.mark.slow
    @pytest.mark.skipif(
        True,  # 默认跳过，需要手动启用
        reason="需要实际安装 sisyphus-api-engine"
    )
    def test_real_execution(self):
        """真实执行测试（需要 sisyphus-api-engine）"""
        yaml_content = """
name: "真实测试"
config:
  profiles:
    prod:
      base_url: "https://httpbin.org"
  active_profile: "prod"
steps:
  - name: "GET请求"
    type: request
    method: GET
    url: "${config.profiles.prod.base_url}/get"
    validations:
      - type: status_code
        expect: "200"
"""

        adapter = APIEngineAdapter()

        # 验证引擎已安装
        if not adapter._check_engine_installed():
            pytest.skip("sisyphus-api-engine 未安装")

        # 执行测试
        result = adapter.execute_test_case(yaml_content)

        # 验证结果
        assert "test_case" in result
        assert result["test_case"]["name"] == "真实测试"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
