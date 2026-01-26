from typing import Optional, Dict, List
from pydantic import BaseModel
from datetime import datetime


# ============================================
# Environment Schemas
# ============================================
class EnvironmentCreate(BaseModel):
    """创建环境配置"""
    name: str
    domain: str = ""
    variables: Dict = {}
    headers: Dict = {}


class EnvironmentUpdate(BaseModel):
    """更新环境配置"""
    name: Optional[str] = None
    domain: Optional[str] = None
    variables: Optional[Dict] = None
    headers: Optional[Dict] = None


class EnvironmentResponse(BaseModel):
    """环境配置响应"""
    id: int
    project_id: int
    name: str
    domain: str
    variables: Dict
    headers: Dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# DataSource Schemas
# ============================================
class DataSourceCreate(BaseModel):
    """创建数据源"""
    name: str
    db_type: str  # mysql, postgresql, mongodb, redis
    host: str
    port: int
    db_name: str  # 数据库名称（必填）
    username: str = ""
    password: str = ""  # 前端传明文，后端加密存储
    variable_name: str  # 引用变量名（必填）
    is_enabled: bool = True


class DataSourceUpdate(BaseModel):
    """更新数据源"""
    name: Optional[str] = None
    db_type: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    db_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None  # 如果提供则更新密码
    variable_name: Optional[str] = None
    is_enabled: Optional[bool] = None


class DataSourceResponse(BaseModel):
    """数据源响应 (不返回密码)"""
    id: int
    project_id: int
    name: str
    db_type: str
    host: str
    port: int
    db_name: str
    username: str
    
    variable_name: str
    is_enabled: bool
    status: str
    last_test_at: Optional[datetime]
    error_msg: Optional[str]
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataSourceTestRequest(BaseModel):
    """测试数据源连接请求"""
    db_type: str
    host: str
    port: int
    db_name: str = ""
    username: str = ""
    password: str = ""


class DataSourceTestResponse(BaseModel):
    """测试数据源连接响应"""
    success: bool
    message: str
