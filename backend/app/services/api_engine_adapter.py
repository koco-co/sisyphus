"""
Sisyphus-api-engine 执行适配器
负责调用 sisyphus-api-engine 命令并处理输出
"""

import os
import json
import subprocess
import tempfile
from typing import Dict, Any, Optional
from pathlib import Path


class APIEngineAdapter:
    """Sisyphus-api-engine 执行适配器"""

    def __init__(self, temp_dir: Optional[str] = None):
        """
        初始化适配器

        Args:
            temp_dir: 临时文件目录，默认为系统临时目录
        """
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.engine_cmd = "sisyphus-api-engine"

        # 确保临时目录存在
        os.makedirs(self.temp_dir, exist_ok=True)

    def execute_test_case(
        self,
        yaml_content: str,
        environment: Optional[str] = None,
        verbose: bool = True,
        output_format: str = "json"
    ) -> Dict[str, Any]:
        """
        执行测试用例

        Args:
            yaml_content: YAML 测试用例内容
            environment: 环境名称（如 dev, prod）
            verbose: 是否详细输出
            output_format: 输出格式（json, csv, html）

        Returns:
            执行结果字典

        Raises:
            RuntimeError: 执行失败
            FileNotFoundError: sisyphus-api-engine 未安装
        """
        # 检查命令是否可用
        if not self._check_engine_installed():
            raise FileNotFoundError(
                "sisyphus-api-engine 未安装或不在 PATH 中。"
                "请先安装: pip install Sisyphus-api-engine"
            )

        # 创建临时 YAML 文件
        temp_yaml_file = None
        temp_output_file = None

        try:
            # 创建临时 YAML 文件
            temp_yaml_file = self._create_temp_file(yaml_content, suffix=".yaml")

            # 构建命令
            cmd = self._build_command(
                temp_yaml_file,
                environment=environment,
                verbose=verbose,
                output_format=output_format
            )

            # 执行命令
            result = self._run_command(cmd)

            # 解析输出
            if output_format == "json":
                # JSON 格式：从标准输出读取
                output_data = self._parse_json_output(result.stdout)
            else:
                # 其他格式：从输出文件读取
                temp_output_file = self._get_output_file_path(temp_yaml_file, output_format)
                output_data = self._read_output_file(temp_output_file, output_format)

            return output_data

        finally:
            # 清理临时文件
            if temp_yaml_file and os.path.exists(temp_yaml_file):
                try:
                    os.remove(temp_yaml_file)
                except Exception:
                    pass

            if temp_output_file and os.path.exists(temp_output_file):
                try:
                    os.remove(temp_output_file)
                except Exception:
                    pass

    def _check_engine_installed(self) -> bool:
        """
        检查 sisyphus-api-engine 是否已安装

        Returns:
            True 如果已安装，False 否则
        """
        try:
            result = subprocess.run(
                ["which", self.engine_cmd],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False

    def _create_temp_file(self, content: str, suffix: str = ".yaml") -> str:
        """
        创建临时文件

        Args:
            content: 文件内容
            suffix: 文件后缀

        Returns:
            临时文件路径
        """
        fd, path = tempfile.mkstemp(suffix=suffix, dir=self.temp_dir)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception:
            os.close(fd)
            raise

        return path

    def _build_command(
        self,
        yaml_file: str,
        environment: Optional[str] = None,
        verbose: bool = True,
        output_format: str = "json"
    ) -> list:
        """
        构建执行命令

        Args:
            yaml_file: YAML 文件路径
            environment: 环境名称
            verbose: 是否详细输出
            output_format: 输出格式

        Returns:
            命令列表
        """
        cmd = [self.engine_cmd, "--cases", yaml_file]

        # 添加环境参数
        if environment:
            cmd.extend(["--profile", environment])

        # 添加输出格式
        cmd.extend(["--format", output_format])

        # 添加详细输出标志
        if verbose:
            cmd.append("-v")

        return cmd

    def _run_command(self, cmd: list) -> subprocess.CompletedProcess:
        """
        运行命令

        Args:
            cmd: 命令列表

        Returns:
            命令执行结果

        Raises:
            RuntimeError: 命令执行失败
        """
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5分钟超时
                cwd=self.temp_dir
            )

            # 检查返回码
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout
                raise RuntimeError(
                    f"执行失败 (返回码: {result.returncode})\n"
                    f"命令: {' '.join(cmd)}\n"
                    f"错误: {error_msg}"
                )

            return result

        except subprocess.TimeoutExpired:
            raise RuntimeError(f"执行超时 (300秒): {' '.join(cmd)}")

        except FileNotFoundError:
            raise FileNotFoundError(
                f"命令未找到: {cmd[0]}。"
                f"请确保 sisyphus-api-engine 已安装并添加到 PATH"
            )

    def _parse_json_output(self, output: str) -> Dict[str, Any]:
        """
        解析 JSON 格式输出

        Args:
            output: 标准输出字符串

        Returns:
            解析后的字典

        Raises:
            ValueError: JSON 解析失败
        """
        try:
            return json.loads(output)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 解析失败: {e}\n输出内容: {output}")

    def _get_output_file_path(self, yaml_file: str, output_format: str) -> str:
        """
        获取输出文件路径

        Args:
            yaml_file: YAML 文件路径
            output_format: 输出格式

        Returns:
            输出文件路径
        """
        yaml_path = Path(yaml_file)
        extensions = {
            "json": ".json",
            "csv": ".csv",
            "html": ".html",
            "junit": ".xml"
        }
        ext = extensions.get(output_format, ".json")
        return str(yaml_path.with_suffix(ext))

    def _read_output_file(self, output_file: str, output_format: str) -> Dict[str, Any]:
        """
        读取输出文件

        Args:
            output_file: 输出文件路径
            output_format: 输出格式

        Returns:
            文件内容（字典格式）
        """
        if not os.path.exists(output_file):
            raise FileNotFoundError(f"输出文件不存在: {output_file}")

        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                content = f.read()

            if output_format == "json":
                return json.loads(content)
            else:
                # 对于非 JSON 格式，返回原始内容
                return {"raw_output": content}

        except Exception as e:
            raise RuntimeError(f"读取输出文件失败: {e}")

    def validate_yaml(self, yaml_content: str) -> bool:
        """
        验证 YAML 文件语法

        Args:
            yaml_content: YAML 内容

        Returns:
            True 如果语法正确，False 否则
        """
        temp_yaml_file = None

        try:
            # 创建临时文件
            temp_yaml_file = self._create_temp_file(yaml_content)

            # 使用 sisyphus-api-validate 验证
            cmd = ["sisyphus-api-validate", temp_yaml_file]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            return result.returncode == 0

        except Exception:
            return False

        finally:
            # 清理临时文件
            if temp_yaml_file and os.path.exists(temp_yaml_file):
                try:
                    os.remove(temp_yaml_file)
                except Exception:
                    pass

    def get_engine_version(self) -> Optional[str]:
        """
        获取 sisyphus-api-engine 版本

        Returns:
            版本字符串，如果获取失败则返回 None
        """
        try:
            cmd = [self.engine_cmd, "--version"]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return result.stdout.strip()
            return None

        except Exception:
            return None


# 便捷函数
def execute_test_case(
    yaml_content: str,
    environment: Optional[str] = None,
    verbose: bool = True
) -> Dict[str, Any]:
    """
    执行测试用例（便捷函数）

    Args:
        yaml_content: YAML 测试用例内容
        environment: 环境名称
        verbose: 是否详细输出

    Returns:
        执行结果字典
    """
    adapter = APIEngineAdapter()
    return adapter.execute_test_case(yaml_content, environment, verbose)
