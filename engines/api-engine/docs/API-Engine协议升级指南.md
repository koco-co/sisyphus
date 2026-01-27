# API-Engine 协议升级指南 (v1.0 → v2.0)

> 本文档帮助你理解 v1.0 和 v2.0 的差异，以及如何平滑升级。

---

## 一、核心改进概览

### 1.1 安全性提升 ⚠️

| 问题 | v1.0 | v2.0 |
|------|------|------|
| **数据库密码暴露** | ❌ YAML中硬编码明文密码 | ✅ 使用连接别名，后端管理 |
| **变量定义混乱** | ❌ 顶层散落变量 | ✅ 统一在 `config.variables` |
| **SQL注入风险** | ❌ 字符串拼接SQL | ✅ 支持预编译语句 |

### 1.2 功能增强 🚀

| 功能 | v1.0 | v2.0 |
|------|------|------|
| **测试步骤控制** | ❌ 不支持 | ✅ `skip_if`, `only_if`, `depends_on` |
| **数据驱动测试** | ❌ 不支持 | ✅ CSV/JSON/数据库数据源 |
| **并发测试** | ❌ 不支持 | ✅ 多线程压测配置 |
| **循环测试** | ❌ 不支持 | ✅ `for` / `while` 循环 |
| **Mock支持** | ❌ 不支持 | ✅ 内置Mock配置 |
| **钩子函数** | ❌ 仅全局钩子 | ✅ 全局 + 步骤级钩子 |
| **环境切换** | ❌ 不支持 | ✅ `profiles` 多环境配置 |
| **错误分类** | ❌ 仅 success/failed/error | ✅ 错误类型 + 分类 |
| **性能指标** | ❌ 仅总耗时 | ✅ DNS/TCP/TLS/Server分解 |
| **重试历史** | ❌ 不记录 | ✅ 完整重试轨迹 |
| **变量追踪** | ❌ 不支持 | ✅ `variables_snapshot` |

---

## 二、输入协议对比

### 2.1 数据库配置（安全关键）

#### ❌ v1.0 设计（存在安全风险）

```yaml
# 旧设计：数据库密码直接写在YAML中
config:
  _database:
    mysql001:
      host: shop-xo.hctestedu.com
      port: 3306
      user: api_test
      password: Aa9999!        # ⚠️ 明文密码暴露
      db: shopxo_hctested

teststeps:
  - type: "database"
    connection: "mysql001"     # 引用上面的配置
    sql: "SELECT * FROM users"
```

#### ✅ v2.0 设计（安全）

```yaml
# 新设计：后端管理连接池，前端只传别名
config:
  variables:
    db_main: "mysql_main"     # 引用后端配置的别名

teststeps:
  - type: "database"
    connection: "${db_main}"  # 使用别名
    sql_type: "mysql"
    command: "query"
    sql: "SELECT * FROM users WHERE id = %s"
    params: [123]              # 预编译语句，防SQL注入
```

**迁移建议**：
1. 后端配置数据库连接池（使用别名管理）
2. 前端YAML只传递连接别名
3. 使用预编译语句代替字符串拼接

---

### 2.2 全局变量定义

#### ❌ v1.0 设计（混乱）

```yaml
# 旧设计：变量散落在顶层
URL: http://shop-xo.hctestedu.com
DSWURL: http://novel.hctestedu.com

config:
  variables:
    test_user: "sisyphus"
```

#### ✅ v2.0 设计（统一）

```yaml
# 新设计：统一在 config.variables
config:
  variables:
    URL: "http://shop-xo.hctestedu.com"
    DSWURL: "http://novel.hctestedu.com"
    test_user: "sisyphus"
```

**迁移建议**：将所有顶层变量移至 `config.variables`

---

### 2.3 测试步骤控制

#### ❌ v1.0 设计（无控制能力）

```yaml
teststeps:
  - name: "测试专用接口"
    type: "api"
    request: { url: "/test/debug" }
```

#### ✅ v2.0 设计（完整控制）

```yaml
teststeps:
  - name: "测试专用接口"
    type: "api"
    tags: ["test-only"]
    priority: "P1"

    # 条件控制
    skip_if: "${env_mode} == 'production'"
    only_if: "${feature_enabled} == true"

    # 依赖关系
    depends_on: ["step_login"]

    request: { url: "/test/debug" }
```

**新增功能**：
- `skip_if`: 满足条件时跳过
- `only_if`: 满足条件时执行
- `depends_on`: 声明式依赖
- `tags` + `priority`: 标签和优先级

---

### 2.4 数据驱动测试

#### ❌ v1.0 设计（无数据驱动）

```yaml
# 旧设计：需要复制多个步骤
teststeps:
  - name: "测试用户1登录"
    request: { json: { username: "user1", password: "pass1" } }

  - name: "测试用户2登录"
    request: { json: { username: "user2", password: "pass2" } }
```

#### ✅ v2.0 设计（数据驱动）

```yaml
teststeps:
  - name: "批量验证用户登录"
    data_provider: "test_data/login_users.csv"
    # CSV格式：
    # username,password,expected
    # user1,pass1,200
    # user2,pass2,200

    request:
      method: "POST"
      url: "/auth/login"
      json:
        username: "${username}"  # 引用CSV列名
        password: "${password}"

    validate:
      - eq: ["status_code", "${expected}"]
```

**优势**：
- 一次定义，多次执行
- 支持CSV/JSON/数据库数据源
- 自动生成多个执行记录

---

### 2.5 并发测试

#### ❌ v1.0 设计（无并发能力）

```yaml
# 旧设计：无法并发执行
teststeps:
  - name: "压测搜索接口"
    type: "api"
    request: { url: "/search" }
```

#### ✅ v2.0 设计（并发压测）

```yaml
teststeps:
  - name: "并发压测：商品搜索"
    type: "api"
    tags: ["performance"]

    parallel:
      enabled: true
      threads: 10        # 10个并发线程
      ramp_up: 5         # 5秒内启动所有线程
      iterations: 100    # 每个线程执行100次
      think_time: 1      # 每次执行间隔（秒）

    request: { url: "/search" }

    validate:
      - lt: ["elapsed", 1.0]  # 响应时间小于1秒
```

**新增输出**：
```json
{
  "performance_summary": {
    "avg_response_time_ms": 280,
    "p90_response_time_ms": 400,
    "p99_response_time_ms": 1200,
    "throughput_per_second": 3.33,
    "error_rate": 0.02
  }
}
```

---

### 2.6 Mock支持

#### ❌ v1.0 设计（无Mock）

```yaml
# 旧设计：直接调用第三方服务
teststeps:
  - name: "调用支付接口"
    type: "api"
    request: { url: "https://third-party.com/pay" }
```

#### ✅ v2.0 设计（内置Mock）

```yaml
teststeps:
  - name: "调用支付接口"
    type: "api"

    request:
      url: "https://third-party.com/pay"
      json: { amount: 100 }

    # Mock配置
    mock:
      enabled: true
      response:
        status_code: 200
        body:
          code: 0
          data:
            payment_id: "MOCK_123"
            status: "success"

    validate:
      - eq: ["body.code", 0]
      - contains: ["body.data.payment_id", "MOCK"]
```

**优势**：
- 测试隔离，不依赖第三方服务
- 可模拟各种异常场景
- 提高测试稳定性

---

## 三、输出协议对比

### 3.1 错误分类

#### ❌ v1.0 设计（简单状态）

```json
{
  "status": "failed"  // 仅知道失败，不知道原因
}
```

#### ✅ v2.0 设计（详细分类）

```json
{
  "status": "failed",
  "error_info": {
    "type": "AssertionError",        // 错误类型
    "category": "business",          // 错误分类
    "message": "业务码校验失败",
    "suggestion": "建议检查：\n1. 测试数据\n2. 环境配置"
  }
}
```

**错误类型**：
- `AssertionError`: 断言错误（业务逻辑）
- `TimeoutError`: 超时错误
- `ConnectionError`: 连接错误
- `HTTPError`: HTTP错误
- `ValidationError`: 验证错误
- `DatabaseError`: 数据库错误
- `ScriptError`: 脚本错误

**错误分类**：
- `business`: 业务错误（中）
- `system`: 系统错误（高）
- `data`: 数据错误（中）
- `config`: 配置错误（高）

---

### 3.2 性能指标

#### ❌ v1.0 设计（仅总耗时）

```json
{
  "duration": 0.2  // 仅知道总耗时
}
```

#### ✅ v2.0 设计（性能分解）

```json
{
  "duration": 0.2,
  "performance": {
    "total_time_ms": 200,
    "dns_time_ms": 20,        // DNS解析耗时
    "tcp_time_ms": 15,        // TCP连接耗时
    "tls_time_ms": 30,        // TLS握手耗时
    "server_time_ms": 120,    // 服务器处理耗时
    "transfer_time_ms": 15    // 数据传输耗时
  }
}
```

**性能优化建议**：
- `dns_time_ms` 高 → 使用长连接、配置DNS缓存
- `tcp_time_ms` 高 → 启用HTTP/2、连接池
- `tls_time_ms` 高 → 启用TLS会话复用
- `server_time_ms` 高 → 后端性能优化

---

### 3.3 重试历史

#### ❌ v1.0 设计（无历史）

```json
{
  "status": "success",
  "duration": 5.5  // 包含重试时间，但看不到过程
}
```

#### ✅ v2.0 设计（完整轨迹）

```json
{
  "status": "success",
  "duration": 5.5,
  "retry_history": [
    {
      "attempt": 1,
      "status": "error",
      "error_type": "TimeoutError",
      "duration": 3.0,
      "timestamp": "2026-01-27T10:00:00Z",
      "error_msg": "Request timeout after 3000ms"
    },
    {
      "attempt": 2,
      "status": "success",
      "duration": 2.5,
      "timestamp": "2026-01-27T10:00:03Z"
    }
  ]
}
```

**优势**：
- 清晰看到每次重试的详情
- 便于诊断偶发性问题
- 评估重试策略的有效性

---

### 3.4 变量追踪

#### ❌ v1.0 设计（无追踪）

```json
{
  "extract_result": {
    "access_token": "eyJhbG..."
  }  // 只知道结果，不知道变化
}
```

#### ✅ v2.0 设计（快照对比）

```json
{
  "extract_result": {
    "access_token": "eyJhbG..."
  },
  "variables_snapshot": {
    "before": {
      "access_token": null,
      "user_id": null
    },
    "after": {
      "access_token": "eyJhbG...",
      "user_id": 10086
    }
  }
}
```

**优势**：
- 清晰看到变量变化
- 便于调试变量传递问题
- 支持变量回溯

---

## 四、实时推送（新增）

### 4.1 WebSocket协议

v2.0 新增实时推送能力，前端可实时接收执行进度。

```javascript
// 连接WebSocket
const ws = new WebSocket('ws://api.example.com/v1/test-suite/execute/stream?task_id=xxx');

// 监听事件
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.event) {
    case 'task_started':
      console.log('任务开始', message.data);
      break;

    case 'step_started':
      console.log('步骤开始', message.data);
      updateStepStatus(message.data.step_id, 'running');
      break;

    case 'step_progress':
      console.log('步骤进度', message.data);
      updateProgress(message.data.progress);
      break;

    case 'step_completed':
      console.log('步骤完成', message.data);
      updateStepStatus(message.data.step_id, message.data.status);
      break;

    case 'task_completed':
      console.log('任务完成', message.data);
      showReport(message.data.report_url);
      break;
  }
};
```

**事件类型**：
- `task_started`: 任务开始
- `step_started`: 步骤开始
- `step_progress`: 步骤进度（长时间操作）
- `step_completed`: 步骤完成
- `step_failed`: 步骤失败
- `step_retried`: 步骤重试
- `task_completed`: 任务完成
- `heartbeat`: 心跳（30秒一次）

---

## 五、迁移检查清单

### 5.1 输入协议迁移

- [ ] **数据库配置**
  - [ ] 将 `_database` 配置移至后端
  - [ ] YAML中使用连接别名
  - [ ] 使用预编译语句代替字符串拼接

- [ ] **全局变量**
  - [ ] 将顶层变量移至 `config.variables`
  - [ ] 使用 `${variable_name}` 引用

- [ ] **测试步骤**
  - [ ] 添加 `tags` 和 `priority`
  - [ ] 添加 `skip_if` / `only_if` 条件控制
  - [ ] 添加 `depends_on` 依赖关系

- [ ] **环境配置**
  - [ ] 使用 `profiles` 管理多环境
  - [ ] 设置 `active_profile`

- [ ] **数据驱动**
  - [ ] 将重复步骤转换为 `data_provider`
  - [ ] 创建测试数据文件（CSV/JSON）

### 5.2 输出协议迁移

- [ ] **错误处理**
  - [ ] 更新前端错误展示逻辑
  - [ ] 区分 `error_type` 和 `error_category`
  - [ ] 展示错误建议（`suggestion`）

- [ ] **性能指标**
  - [ ] 添加性能图表（DNS/TCP/TLS/Server分解）
  - [ ] 并发测试添加百分位图（P50/P90/P95/P99）

- [ ] **重试历史**
  - [ ] 展示重试时间轴
  - [ ] 支持展开查看每次重试详情

- [ ] **变量追踪**
  - [ ] 展示变量快照对比
  - [ ] 高亮显示变化的变量

- [ ] **实时推送**
  - [ ] 集成WebSocket客户端
  - [ ] 实现实时进度条
  - [ ] 实现实时日志流

---

## 六、向后兼容性

### 6.1 输入协议兼容性

v2.0 引擎**向后兼容** v1.0 格式，但会有警告：

```yaml
# v1.0 格式在 v2.0 中仍可运行
config:
  _database:  # ⚠️ 警告：不推荐，建议使用连接别名
    mysql001:
      password: Aa9999!

  variables:
    test_user: "sisyphus"
```

**日志输出**：
```
⚠️  Warning: Using deprecated '_database' configuration.
   Please migrate to connection aliases.
   See: https://docs.example.com/migration-guide
```

### 6.2 输出协议兼容性

v2.0 引擎默认输出 v2.0 格式，可通过参数切换：

```bash
# 使用 v2.0 格式（默认）
api-engine run case.yaml

# 使用 v1.0 格式
api-engine run case.yaml --output-format=v1
```

---

## 七、升级路径建议

### 7.1 渐进式升级

#### 阶段1：安全升级（P0）⚠️
```
1. 后端配置数据库连接池
2. YAML改用连接别名
3. 使用预编译SQL语句
```

#### 阶段2：功能升级（P1）🚀
```
1. 添加测试步骤控制
2. 实现数据驱动测试
3. 添加环境切换
```

#### 阶段3：监控升级（P2）📊
```
1. 升级错误处理逻辑
2. 添加性能指标展示
3. 实现实时推送
```

### 7.2 并行运行策略

```yaml
# 新建 v2 版本用例
cases/
  v1/
    - case_user_login.yaml
    - case_order_create.yaml
  v2/
    - case_user_login_v2.yaml  # 使用新特性
    - case_order_create_v2.yaml
```

---

## 八、常见问题（FAQ）

### Q1: v1.0 用例在 v2.0 引擎中能运行吗？

**A**: 能运行，但会有警告。建议逐步迁移到新格式。

### Q2: 如何处理数据库密码？

**A**:
1. **推荐**: 后端配置连接池，前端传别名
2. **临时方案**: 使用环境变量 `${DB_PASSWORD}`

### Q3: 数据驱动测试的性能如何？

**A**:
- CSV/JSON文件: 读入内存，性能好（< 1000行）
- 数据库数据源: 支持流式读取（大数据量）

### Q4: 并发测试会压垮服务器吗？

**A**:
- 建议从小并发开始（2-5线程）
- 使用 `ramp_up` 缓慢启动
- 监控服务器资源

### Q5: 实时推送必须用WebSocket吗？

**A**:
- 推荐: WebSocket（双向、实时）
- 备选: Server-Sent Events（单向）
- 降级: 轮询API（兼容性好）

---

## 九、资源链接

- [输入协议 v2.0 完整文档](./INPUT_PROTOCOL_V2.md)
- [输出协议 v2.0 完整文档](./OUTPUT_PROTOCOL_V2.md)
- [安全最佳实践](./SECURITY_GUIDE.md)
- [性能优化指南](./PERFORMANCE_GUIDE.md)
- [API文档](./API_REFERENCE.md)

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-01-27 | 初始版本 |
