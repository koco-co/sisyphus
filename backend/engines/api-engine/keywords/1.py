# -*- coding: utf-8 -*-
"""
关键字: 1
分类: request
描述: 无
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


# -*- coding： UTF-8 -*—

#--示例代码--请根据需要编写

class hami_keyword:
    # class名称必须与关键字名称一致 
    def _init_(self):
        pass

    # 新增关键字：title断言
    def hami_keyword(self, **kwargs): 
        # 方法名称必须与关键字名称一致 
        print(kwargs["输出内容"])