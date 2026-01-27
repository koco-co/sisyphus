# -*- coding: utf-8 -*-
"""
关键字: jsonPath提取
分类: extract
描述: 无
自动生成，请勿手动修改
"""

# -*- coding: UTF-8 -*-
# --示例代码--请根据需要编写

class ex_jsonData:
    """JsonPath提取器关键字类, 用于从JSON数据中提取指定路径的值"""

    def __init__(self):
        """初始化JsonPath提取器"""
        pass

    def ex_jsonData(self, EXVALUE, INDEX, VARNAME):
        """使用JsonPath表达式从JSON数据中提取指定路径的值
        
        该方法支持复杂的JsonPath表达式, 可以从嵌套的JSON结构中提取数据, 
        支持数组索引、通配符、过滤表达式等多种提取方式。

        Args:
            EXVALUE (dict|list|str): 要提取的源数据, 可以是字典、列表或JSON字符串
                示例：
                - 字典: {"user": {"name": "张三", "age": 25}}
                - 列表: [{"id": 1}, {"id": 2}]
                - JSON字符串: '{"data": {"items": [1, 2, 3]}}'
            INDEX (str): JsonPath表达式路径, 用于定位要提取的数据
                示例：
                - 简单路径: "$.user.name" 提取 user.name
                - 数组索引: "$.data.items[0]" 提取第一个元素
                - 通配符: "$.users[*].name" 提取所有用户名称
                - 过滤: "$.users[?(@.age>18)]" 提取年龄大于18的用户
            VARNAME (str): 提取后的变量名称, 用于后续步骤引用
                示例: "user_name"、"user_id"、"extracted_data"

        Returns:
            dict: 包含提取结果的字典
                {
                    "success": bool,  # 提取是否成功
                    "value": any,    # 提取到的值
                    "varname": str,  # 变量名称
                    "message": str   # 结果消息
                }

        Raises:
            ValueError: 当INDEX格式不正确时抛出
            TypeError: 当EXVALUE不是支持的类型时抛出
            KeyError: 当指定的路径不存在时抛出

        Examples:
            >>> extractor = jsonpath提取器()
            >>> data = {"user": {"name": "张三", "age": 25}}
            >>> result = extractor.jsonpath提取器(
            ...     EXVALUE=data,
            ...     INDEX="$.user.name",
            ...     VARNAME="username"
            ... )
            >>> print(result)
            {'success': True, 'value': '张三', 'varname': 'username', 'message': '提取成功'}
            
            >>> # 从数组中提取
            >>> data = {"users": [{"id": 1, "name": "张三"}, {"id": 2, "name": "李四"}]}
            >>> result = extractor.jsonpath提取器(
            ...     EXVALUE=data,
            ...     INDEX="$.users[0].name",
            ...     VARNAME="first_user_name"
            ... )
            >>> print(result)
            {'success': True, 'value': '张三', 'varname': 'first_user_name', 'message': '提取成功'}

        Note:
            - 需要安装 jsonpath-ng 库: pip install jsonpath-ng
            - 如果提取到多个值, 默认返回第一个值
            - 如果路径不存在, 返回 None 并给出警告信息
            - EXVALUE如果是JSON字符串, 会自动解析为字典对象
        """
        try:
            from jsonpath_ng import parse
            import json

            # 处理输入数据
            if isinstance(EXVALUE, str):
                # 如果是字符串, 尝试解析为JSON
                try:
                    data = json.loads(EXVALUE)
                except json.JSONDecodeError as e:
                    return {
                        "success": False,
                        "value": None,
                        "varname": VARNAME,
                        "message": f"JSON解析失败: {str(e)}"
                    }
            else:
                data = EXVALUE

            # 编译JsonPath表达式
            try:
                jsonpath_expression = parse(INDEX)
            except Exception as e:
                return {
                    "success": False,
                    "value": None,
                    "varname": VARNAME,
                    "message": f"JsonPath表达式解析失败: {str(e)}"
                }

            # 执行提取
            matches = jsonpath_expression.find(data)

            if not matches:
                return {
                    "success": False,
                    "value": None,
                    "varname": VARNAME,
                    "message": f"路径 '{INDEX}' 在数据中未找到匹配项"
                }

            # 获取提取的值
            if len(matches) == 1:
                extracted_value = matches[0].value
            else:
                # 如果有多个匹配, 返回所有值
                extracted_value = [match.value for match in matches]

            # 打印提取结果（用于日志）
            print(f"变量 [{VARNAME}] 提取成功: {extracted_value}")

            return {
                "success": True,
                "value": extracted_value,
                "varname": VARNAME,
                "message": "提取成功"
            }

        except ImportError:
            return {
                "success": False,
                "value": None,
                "varname": VARNAME,
                "message": "缺少必需的库 jsonpath-ng, 请先安装: pip install jsonpath-ng"
            }
        except Exception as e:
            return {
                "success": False,
                "value": None,
                "varname": VARNAME,
                "message": f"提取过程中发生错误: {str(e)}"
            }
