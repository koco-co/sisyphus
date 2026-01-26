import socket
import asyncio
import logging
import aiomysql
from typing import Optional

logger = logging.getLogger(__name__)

def test_tcp_connection(host: str, port: int, timeout: int = 5) -> tuple[bool, str]:
    """
    测试 TCP 连接
    返回: (是否成功, 消息/错误信息)
    """
    try:
        # 简单的 TCP 连接测试
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()

        if result == 0:
            return True, "Success"
        else:
            return False, f"Connection failed (error code: {result})"
    except socket.timeout:
        return False, "Connection timed out"
    except Exception as e:
        return False, str(e)


async def test_mysql_connection(
    host: str,
    port: int,
    username: str,
    password: str,
    database: Optional[str] = None,
    timeout: int = 5
) -> tuple[bool, str]:
    """
    测试 MySQL 数据库连接
    返回: (是否成功, 消息/错误信息)
    """
    conn = None
    try:
        # 尝试连接 MySQL 数据库
        conn = await aiomysql.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            db=database,
            connect_timeout=timeout,
            charset='utf8mb4'
        )

        # 如果连接成功，尝试执行一个简单查询验证连接可用性
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT 1")
            result = await cursor.fetchone()
            if result and result[0] == 1:
                db_info = f"{host}:{port}"
                if database:
                    db_info += f"/{database}"
                return True, f"成功连接到 MySQL 数据库 ({db_info})"
            else:
                return False, "连接成功但查询验证失败"

    except aiomysql.OperationalError as e:
        error_code = e.args[0] if e.args else 0
        if error_code == 1045:
            return False, "认证失败：用户名或密码错误"
        elif error_code == 2003:
            return False, f"无法连接到 MySQL 服务器 {host}:{port}"
        elif error_code == 1049:
            return False, f"数据库 '{database}' 不存在"
        elif error_code == 1044:
            return False, f"用户 '{username}' 没有访问数据库 '{database}' 的权限"
        else:
            return False, f"MySQL 操作错误 (代码: {error_code}): {str(e)}"

    except aiomysql.Error as e:
        return False, f"MySQL 错误: {str(e)}"

    except asyncio.TimeoutError:
        return False, f"连接超时 ({timeout}s)"

    except Exception as e:
        return False, f"未知错误: {str(e)}"

    finally:
        if conn:
            conn.close()
