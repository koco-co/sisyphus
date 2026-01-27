# -*- coding: utf-8 -*-
"""
关键字: 恶趣味去
分类: request
描述: 温热武器而
自动生成，请勿手动修改
"""

def send_request(url: str, method: str = "GET", headers: dict = None, body: dict = None) -> dict:
    """发送HTTP请求"""
    import requests
    
    response = requests.request(
        method=method,
        url=url,
        headers=headers or {},
        json=body
    )
    return {
        "status_code": response.status_code,
        "body": response.json() if response.text else None,
        "headers": dict(response.headers)
    }
