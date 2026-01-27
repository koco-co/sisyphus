"""Sisyphus API Engine - Enterprise-grade API Automation Testing Engine.

This package provides the core functionality for executing YAML-based API tests.
"""

__version__ = "2.0.0"
__author__ = "Sisyphus Testing Platform"

from apisix.core.models import (
    TestCase,
    TestStep,
    GlobalConfig,
    ProfileConfig,
    ValidationRule,
    Extractor,
    StepResult,
    TestCaseResult,
    ErrorInfo,
    PerformanceMetrics,
    HttpMethod,
    ErrorCategory,
)

from apisix.core.variable_manager import VariableManager, VariableScope
from apisix.parser.v2_yaml_parser import V2YamlParser, parse_yaml_file, parse_yaml_string
from apisix.executor.test_case_executor import TestCaseExecutor
from apisix.executor.api_executor import APIExecutor
from apisix.validation.engine import ValidationEngine
from apisix.result.collector import ResultCollector

__all__ = [
    # Models
    "TestCase",
    "TestStep",
    "GlobalConfig",
    "ProfileConfig",
    "ValidationRule",
    "Extractor",
    "StepResult",
    "TestCaseResult",
    "ErrorInfo",
    "PerformanceMetrics",
    "HttpMethod",
    "ErrorCategory",
    # Core
    "VariableManager",
    "VariableScope",
    # Parser
    "V2YamlParser",
    "parse_yaml_file",
    "parse_yaml_string",
    # Executor
    "TestCaseExecutor",
    "APIExecutor",
    # Validation
    "ValidationEngine",
    # Result
    "ResultCollector",
]
