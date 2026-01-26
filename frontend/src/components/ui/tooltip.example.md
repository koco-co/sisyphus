# Tooltip 组件使用指南

这是一个符合主题的全局 Tooltip 组件，支持深色/浅色主题，带有玻璃态效果。

## 特性

- ✨ 支持深色/浅色主题自动切换
- 🎨 玻璃态背景效果（backdrop-filter blur）
- 📍 支持四个方向：top、bottom、left、right
- ⚡ 流畅的悬浮动画
- 🔄 可复用的全局样式
- 📱 自动换行和最大宽度控制

## 使用方式

### 方式一：使用 Tooltip 组件（推荐）

```tsx
import { Tooltip } from '@/components/ui/tooltip';

function MyComponent() {
    return (
        // 基本用法
        <Tooltip content="这是提示内容" position="top">
            <div className="truncate">很长很长很长很长很长的文本...</div>
        </Tooltip>

        // 不同方向
        <Tooltip content="顶部提示" position="top">
            <button>悬浮我看顶部</button>
        </Tooltip>

        <Tooltip content="底部提示" position="bottom">
            <button>悬浮我看底部</button>
        </Tooltip>

        <Tooltip content="左侧提示" position="left">
            <button>悬浮我看左侧</button>
        </Tooltip>

        <Tooltip content="右侧提示" position="right">
            <button>悬浮我看右侧</button>
        </Tooltip>
    );
}
```

### 方式二：使用全局样式类（无需导入组件）

直接在任意元素上添加 `tooltip` 类和 `data-tooltip` 属性：

```tsx
// 顶部提示（默认）
<div className="tooltip tooltip-top" data-tooltip="这是提示内容">
    悬浮查看完整内容
</div>

// 底部提示
<div className="tooltip tooltip-bottom" data-tooltip="底部提示">
    悬浮查看
</div>

// 左侧提示
<div className="tooltip tooltip-left" data-tooltip="左侧提示">
    悬浮查看
</div>

// 右侧提示
<div className="tooltip tooltip-right" data-tooltip="右侧提示">
    悬浮查看
</div>
```

## 实际应用示例

### 示例 1：表格中的长文本（推荐写法）

```tsx
// 表格设置
<table className="w-full text-left table-fixed">
    <thead>
        <tr>
            <th className="w-[200px]">项目名称</th>
            <th className="w-[300px]">项目描述</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td className="w-[200px]">
                <Tooltip content={project.name} position="top">
                    <span className="truncate block w-full">
                        {project.name}
                    </span>
                </Tooltip>
            </td>
            <td className="w-[300px]">
                <Tooltip content={project.description} position="top">
                    <span className="truncate block w-full">
                        {project.description}
                    </span>
                </Tooltip>
            </td>
        </tr>
    </tbody>
</table>
```

**关键点：**
- 表格添加 `table-fixed` 类，确保列宽固定
- `th` 和 `td` 都要设置相同的宽度（如 `w-[200px]`）
- 使用 `<span className="truncate block w-full">` 确保文本截断
- `Tooltip` 组件包裹在文本外层

### 示例 2：按钮提示

```tsx
<Tooltip content="编辑项目" position="top">
    <button>
        <EditIcon className="w-4 h-4" />
    </button>
</Tooltip>
```

### 示例 3：图片悬浮提示

```tsx
<Tooltip content="用户头像" position="bottom">
    <img src="/avatar.png" alt="Avatar" />
</Tooltip>
```

### 示例 4：使用全局样式

```tsx
// 无需导入组件，直接使用
<button
    className="tooltip tooltip-top"
    data-tooltip="点击保存"
    onClick={handleSave}
>
    保存
</button>
```

## 样式特性

### 深色主题（默认）
- 背景：半透明深色玻璃态
- 文字：浅色
- 边框：白色半透明
- 阴影：深色阴影

### 浅色主题
- 背景：半透明白色玻璃态
- 文字：深色
- 边框：黑色半透明
- 阴影：浅色阴影

## 参数说明

### Tooltip 组件参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content | string | 必填 | 提示内容 |
| children | ReactNode | 必填 | 子元素 |
| position | 'top' \| 'bottom' \| 'left' \| 'right' | 'top' | 显示位置 |

## CSS 样式位置

全局样式定义在：`/frontend/src/index.css`

样式类包括：
- `.tooltip` - 基础 tooltip 类
- `.tooltip-top` - 顶部显示
- `.tooltip-bottom` - 底部显示
- `.tooltip-left` - 左侧显示
- `.tooltip-right` - 右侧显示
- `.tooltip-wrapper` - Tooltip 组件容器

## 注意事项

1. **文本截断**：配合 `truncate` 类使用效果最佳
2. **最大宽度**：Tooltip 最大宽度为 300px，超出会自动换行
3. **层级**：Tooltip z-index 为 9999，确保在最上层显示
4. **性能**：使用 CSS 伪元素实现，性能优异
5. **主题**：自动跟随系统深色/浅色主题切换

## 迁移指南

如果你之前使用原生 `title` 属性：

```tsx
// ❌ 旧方式
<div title="提示内容">内容</div>

// ✅ 新方式（组件）
<Tooltip content="提示内容">
    <div>内容</div>
</Tooltip>

// ✅ 新方式（全局类）
<div className="tooltip tooltip-top" data-tooltip="提示内容">
    内容
</div>
```

## 浏览器兼容性

- ✅ Chrome/Edge 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ 需要 backdrop-filter 支持（IE 不支持）
