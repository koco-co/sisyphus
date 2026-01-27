import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
    label: string;
    value: string | number;
}

type Size = 'sm' | 'md' | 'lg';

interface CustomSelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    size?: Size;
}

export function CustomSelect({
    value,
    onChange,
    options,
    placeholder = '请选择',
    className,
    disabled = false,
    size = 'md'
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // 尺寸配置
    const sizeStyles = {
        sm: 'h-8 px-2.5 py-1 text-xs rounded-xl',
        md: 'h-12 px-4 py-2 text-sm rounded-2xl',
        lg: 'h-14 px-5 py-3 text-base rounded-2xl'
    };

    const borderStyles = {
        sm: 'border-white/5',
        md: 'border-white/10',
        lg: 'border-white/10'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full flex items-center justify-between",
                    "bg-white/5 border text-left",
                    "text-white transition-all duration-200",
                    "hover:bg-white/10",
                    "focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20",
                    isOpen && "border-cyan-500/50 ring-1 ring-cyan-500/20 bg-white/10",
                    disabled && "opacity-50 cursor-not-allowed hover:bg-white/5",
                    sizeStyles[size],
                    borderStyles[size]
                )}
            >
                <span className={cn("block truncate font-medium", !selectedOption && "text-slate-500")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        iconSizes[size],
                        "text-slate-500 transition-transform duration-200 flex-shrink-0 ml-1.5",
                        isOpen && "transform rotate-180 text-cyan-400"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={cn(
                            "absolute z-50 w-full mt-2 overflow-hidden",
                            "bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50"
                        )}
                    >
                        <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        "w-full px-4 py-2.5 flex items-center justify-between text-sm transition-colors",
                                        "hover:bg-white/10",
                                        option.value === value
                                            ? "text-cyan-400 bg-cyan-500/10 font-medium"
                                            : "text-slate-300"
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {option.value === value && (
                                        <Check className="w-4 h-4 ml-2 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    暂无选项
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
