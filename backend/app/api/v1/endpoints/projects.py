from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.hash import bcrypt
from app.core.db import get_session
from app.api import deps
from app.models.project import Project, ProjectEnvironment, ProjectDataSource
from app.schemas.pagination import PageResponse
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.environment import (
    EnvironmentCreate, EnvironmentUpdate, EnvironmentResponse,
    DataSourceCreate, DataSourceUpdate, DataSourceResponse,
    DataSourceTestRequest, DataSourceTestResponse
)

router = APIRouter()


# ============================================
# Project CRUD
# ============================================
@router.get("/", response_model=PageResponse[Project])
async def read_projects(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    name: str = Query(None, description="Project name search term"),
    session: AsyncSession = Depends(get_session)
):
    # Base query
    query = select(Project)
    if name:
        query = query.where(Project.name.contains(name))

    # Count
    count_statement = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_statement)).scalar()
    
    # Pagination
    skip = (page - 1) * size
    statement = query.order_by(Project.updated_at.desc()).offset(skip).limit(size)
    result = await session.execute(statement)
    projects = result.scalars().all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return PageResponse(
        items=projects,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/", response_model=Project)
async def create_project(
    project: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(deps.get_current_user)
):
    """创建新项目

    - **name**: 项目名称，1-50个字符
    - **key**: 项目标识
    - **description**: 项目描述，最多200个字符
    """
    # Auto-assign owner from current user
    new_project = Project(
        name=project.name.strip(),
        key=project.key.strip(),
        description=project.description.strip() if project.description else None,
        owner=current_user.username
    )

    session.add(new_project)
    await session.commit()
    await session.refresh(new_project)
    return new_project

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新项目信息

    - **name**: 项目名称，1-50个字符
    - **description**: 项目描述，最多200个字符
    """
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # Update fields
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(project, key) and key not in ['id', 'created_at', 'updated_at']:
            setattr(project, key, value)

    project.updated_at = datetime.utcnow()
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

@router.get("/{project_id}", response_model=Project)
async def read_project(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await session.delete(project)
    await session.commit()
    return {"message": "Project deleted"}


# ============================================
# Environment CRUD
# ============================================
@router.get("/{project_id}/environments", response_model=List[EnvironmentResponse])
async def list_environments(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取项目的所有环境配置"""
    statement = select(ProjectEnvironment).where(ProjectEnvironment.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()

@router.post("/{project_id}/environments", response_model=EnvironmentResponse)
async def create_environment(
    project_id: int,
    env: EnvironmentCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建新环境配置"""
    # 检查项目是否存在
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_env = ProjectEnvironment(
        project_id=project_id,
        name=env.name,
        domain=env.domain,
        variables=env.variables,
        headers=env.headers
    )
    session.add(db_env)
    await session.commit()
    await session.refresh(db_env)
    return db_env

@router.get("/{project_id}/environments/{env_id}", response_model=EnvironmentResponse)
async def get_environment(
    project_id: int,
    env_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取单个环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env

@router.put("/{project_id}/environments/{env_id}", response_model=EnvironmentResponse)
async def update_environment(
    project_id: int,
    env_id: int,
    env_update: EnvironmentUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    update_data = env_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(env, key, value)
    env.updated_at = datetime.utcnow()
    
    session.add(env)
    await session.commit()
    await session.refresh(env)
    return env

@router.delete("/{project_id}/environments/{env_id}")
async def delete_environment(
    project_id: int,
    env_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    await session.delete(env)
    await session.commit()
    return {"message": "Environment deleted"}

@router.post("/{project_id}/environments/{env_id}/copy", response_model=EnvironmentResponse)
async def copy_environment(
    project_id: int,
    env_id: int,
    session: AsyncSession = Depends(get_session)
):
    """深拷贝环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # 创建副本
    new_env = ProjectEnvironment(
        project_id=project_id,
        name=f"{env.name} (Copy)",
        domain=env.domain,
        variables=dict(env.variables),  # 深拷贝字典
        headers=dict(env.headers)
    )
    session.add(new_env)
    await session.commit()
    await session.refresh(new_env)
    return new_env


# ============================================
# DataSource CRUD
# ============================================
@router.get("/{project_id}/datasources", response_model=List[DataSourceResponse])
async def list_datasources(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取项目的所有数据源"""
    statement = select(ProjectDataSource).where(ProjectDataSource.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()

@router.post("/{project_id}/datasources", response_model=DataSourceResponse)
async def create_datasource(
    project_id: int,
    ds: DataSourceCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建新数据源"""
    from app.core.network import test_mysql_connection
    from datetime import datetime

    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 加密密码
    password_hash = bcrypt.hash(ds.password) if ds.password else ""

    # 尝试测试连接以确定初始状态
    status = "unchecked"
    error_msg = None
    last_test_at = datetime.utcnow()

    if ds.username and ds.password:
        success, message = await test_mysql_connection(
            host=ds.host,
            port=ds.port,
            username=ds.username,
            password=ds.password,
            database=ds.db_name if ds.db_name else None
        )
        status = "connected" if success else "error"
        error_msg = None if success else message

    db_ds = ProjectDataSource(
        project_id=project_id,
        name=ds.name,
        db_type=ds.db_type,
        host=ds.host,
        port=ds.port,
        db_name=ds.db_name,
        username=ds.username,
        password_hash=password_hash,
        variable_name=ds.variable_name,
        is_enabled=ds.is_enabled,
        status=status,
        last_test_at=last_test_at,
        error_msg=error_msg
    )
    session.add(db_ds)
    await session.commit()
    await session.refresh(db_ds)
    return db_ds

@router.put("/{project_id}/datasources/{ds_id}", response_model=DataSourceResponse)
async def update_datasource(
    project_id: int,
    ds_id: int,
    ds_update: DataSourceUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新数据源"""
    from app.core.network import test_mysql_connection

    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")

    update_data = ds_update.model_dump(exclude_unset=True)

    # 特殊处理密码字段
    password_updated = False
    if 'password' in update_data:
        password = update_data.pop('password')
        if password:
            ds.password_hash = bcrypt.hash(password)
            password_updated = True

    # 检查是否需要重新测试连接（配置发生变化）
    should_retest = any(key in update_data for key in ['host', 'port', 'username', 'db_name']) or password_updated

    for key, value in update_data.items():
        setattr(ds, key, value)
    ds.updated_at = datetime.utcnow()

    # 如果连接配置发生变化，重新测试连接
    if should_retest and ds.username and ds.password_hash:
        # 注意：这里需要使用原始密码，但update时密码已经被加密了
        # 所以我们只在password字段有值时才测试
        if 'password' in ds_update or any(key in update_data for key in ['host', 'port', 'username', 'db_name']):
            # 如果没有提供新密码，使用现有密码哈希（但无法解密，所以无法测试）
            # 这里简化处理：只在提供了新密码或相关配置变更时标记为unchecked
            ds.status = "unchecked"
            ds.error_msg = None
            ds.last_test_at = datetime.utcnow()

    session.add(ds)
    await session.commit()
    await session.refresh(ds)
    return ds

@router.delete("/{project_id}/datasources/{ds_id}")
async def delete_datasource(
    project_id: int,
    ds_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除数据源"""
    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")
    
    await session.delete(ds)
    await session.commit()
    return {"message": "DataSource deleted"}

@router.post("/datasources/test", response_model=DataSourceTestResponse)
async def test_datasource_connection(
    test_req: DataSourceTestRequest
):
    """测试数据源连接 (不保存)"""
    from app.core.network import test_mysql_connection, test_tcp_connection

    # 验证必填字段
    if not test_req.host or not test_req.port:
        return DataSourceTestResponse(
            success=False,
            message="主机地址和端口不能为空"
        )

    # 如果没有提供用户名或密码，只测试 TCP 连接
    if not test_req.username or not test_req.password:
        success, message = test_tcp_connection(test_req.host, test_req.port)
        if success:
            return DataSourceTestResponse(
                success=True,
                message=f"TCP 连接成功 ({test_req.host}:{test_req.port})，但未提供数据库账号，无法验证数据库连接"
            )
        else:
            return DataSourceTestResponse(
                success=False,
                message=f"TCP 连接失败: {message}"
            )

    # 测试 MySQL 数据库连接
    success, message = await test_mysql_connection(
        host=test_req.host,
        port=test_req.port,
        username=test_req.username,
        password=test_req.password,
        database=test_req.db_name
    )

    return DataSourceTestResponse(
        success=success,
        message=message
    )

