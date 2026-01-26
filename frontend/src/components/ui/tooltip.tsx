import { ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip 组件 - 鼠标悬浮显示提示信息
 *
 * 使用方法：
 * ```tsx
 * <Tooltip content="完整的项目名称">
 *   <div className="truncate">简短的项目名称</div>
 * </Tooltip>
 * ```
 *
 * 全局样式类（可直接使用，无需组件）：
 * ```tsx
 * <div className="tooltip" data-tooltip="提示内容">
 *   内容
 * </div>
 * ```
 */
export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    return (
        <span className={`tooltip-wrapper tooltip-${position}`} data-tooltip={content}>
            {children}
        </span>
    );
}
