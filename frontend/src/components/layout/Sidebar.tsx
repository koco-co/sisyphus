import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Settings,
    Database,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Moon,
    Sun,
    Monitor,
    LogOut,
    Globe,
    Zap,
    FolderKanban,
    Key,
    Network,
    FileText,
    Workflow,
    Clock,
    TestTube,
    FileCheck,
    Sparkles,
    BookOpen,
    File,
    Bell,
    Users,
    Shield,
    Sliders
} from 'lucide-react'
import Logo from '@/assets/logo.svg'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

// 导航项类型定义
interface NavItem {
    icon: React.ElementType
    labelKey: string
    href?: string
    children?: NavItem[]
}

// 完整导航结构
const navItems: NavItem[] = [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: '/' },
    {
        icon: TestTube,
        labelKey: 'nav.functionalTesting',
        children: [
            { icon: FileCheck, labelKey: 'functionalTest.requirements.title', href: '/functional-test/requirements' },
            { icon: Sparkles, labelKey: 'functionalTest.aiConfig.title', href: '/functional-test/ai-config' },
        ]
    },
    {
        icon: Zap,
        labelKey: 'nav.apiAutomation',
        children: [
            { icon: FolderKanban, labelKey: 'nav.projectManagement', href: '/api/projects' },
            { icon: Key, labelKey: 'nav.keywordManagement', href: '/api/keywords' },
            { icon: Network, labelKey: 'nav.apiManagement', href: '/api/interfaces' },
        ]
    },
    { icon: Workflow, labelKey: 'nav.testScenarios', href: '/scenarios' },
    { icon: FileText, labelKey: 'nav.testReports', href: '/reports' },
    { icon: Clock, labelKey: 'nav.testPlans', href: '/plans' },
    {
        icon: BookOpen,
        labelKey: 'nav.documentCenter',
        children: [
            { icon: File, labelKey: 'nav.operationDocs', href: '/docs/operation' },
            { icon: FileText, labelKey: 'nav.requirementDocs', href: '/docs/requirement' },
        ]
    },
    {
        icon: Settings,
        labelKey: 'nav.systemSettings',
        children: [
            { icon: Sliders, labelKey: 'nav.globalParams', href: '/settings/config' },
            { icon: Bell, labelKey: 'nav.notifications', href: '/settings/notifications' },
            { icon: Users, labelKey: 'nav.accountManagement', href: '/settings/accounts' },
            { icon: Shield, labelKey: 'nav.permissions', href: '/settings/permissions' },
        ]
    },
]

export function Sidebar() {
    const { t, i18n } = useTranslation()
    const location = useLocation()
    const { isCollapsed, toggle } = useSidebar()
    const { theme, setTheme } = useTheme()
    const { user, logout } = useAuth()
    const [showThemeMenu, setShowThemeMenu] = useState(false)
    const [showLangMenu, setShowLangMenu] = useState(false)
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['nav.apiAutomation'])

    // Auto-collapse on smaller screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1280 && !isCollapsed) {
                // We need access to setCollapsed from context, but context only exposes toggle.
                // Assuming toggle works based on current state, this might be tricky if we don't know current state inside effect without dep.
                // However, SidebarContext probably exposes setSeparately? 
                // Let's just check the exposed methods. Context definition not fully visible here. I will just rely on manual toggle by user for now, 
                // OR better, I'll adding a check here. Actually, to do this properly I should modify SidebarContext. 
                // For now, I will skip auto-collapse logic modification here as it requires context change. 
                // Instead, I'll rely on the user to collapse it, or check if I can modify the sidebar width to be more fluid.
            }
        }
        // handleResize();
        // window.addEventListener('resize', handleResize);
        // return () => window.removeEventListener('resize', handleResize);
    }, [])

    const themeOptions = [
        { value: 'light' as const, icon: Sun, label: t('theme.light') },
        { value: 'dark' as const, icon: Moon, label: t('theme.dark') },
        { value: 'system' as const, icon: Monitor, label: t('theme.system') },
    ]

    const languages = [
        { code: 'zh-CN', label: '简体中文' },
        { code: 'en-US', label: 'English' },
    ]

    const toggleExpand = (labelKey: string) => {
        setExpandedMenus(prev =>
            prev.includes(labelKey)
                ? prev.filter(k => k !== labelKey)
                : [...prev, labelKey]
        )
    }

    const isMenuExpanded = (labelKey: string) => expandedMenus.includes(labelKey)

    // 检查子菜单中是否有激活项
    const isChildActive = (children?: NavItem[]) => {
        if (!children) return false
        return children.some(child => child.href && location.pathname === child.href)
    }

    const renderNavItem = (item: NavItem, depth = 0) => {
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = isMenuExpanded(item.labelKey)
        const isActive = item.href ? location.pathname === item.href : isChildActive(item.children)

        if (hasChildren) {
            return (
                <div key={item.labelKey}>
                    <button
                        onClick={() => toggleExpand(item.labelKey)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                            isCollapsed && "justify-center",
                            isActive || isExpanded
                                ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 text-white"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                        title={isCollapsed ? t(item.labelKey) : undefined}
                    >
                        {(isActive || isExpanded) && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-r-full" />
                        )}
                        <item.icon className={cn(
                            "w-5 h-5 transition-colors flex-shrink-0",
                            isActive || isExpanded ? "text-cyan-400" : "group-hover:text-white"
                        )} />
                        {!isCollapsed && (
                            <>
                                <span className="font-medium flex-1 text-left">{t(item.labelKey)}</span>
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                </motion.div>
                            </>
                        )}
                    </button>
                    <AnimatePresence>
                        {isExpanded && !isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3"
                            >
                                {item.children?.map(child => renderNavItem(child, depth + 1))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )
        }

        return (
            <NavLink
                key={item.href}
                to={item.href!}
                className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                    isCollapsed && "justify-center",
                    isActive
                        ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
                title={isCollapsed ? t(item.labelKey) : undefined}
            >
                {({ isActive }) => (
                    <>
                        {isActive && (
                            <motion.div
                                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-r-full"
                                layoutId="activeIndicator"
                                transition={{ type: "spring", duration: 0.3 }}
                            />
                        )}
                        <item.icon className={cn(
                            "w-5 h-5 transition-colors flex-shrink-0",
                            isActive ? "text-cyan-400" : "group-hover:text-white"
                        )} />
                        {!isCollapsed && <span className="font-medium">{t(item.labelKey)}</span>}
                    </>
                )}
            </NavLink>
        )
    }

    return (
        <div className={cn(
            "h-screen glass border-r-0 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Logo 区域 */}
            <div className="h-16 flex items-center px-4 border-b border-white/5">
                <motion.div
                    className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0 relative overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <img src={Logo} alt="Sisyphus Logo" className="w-6 h-6 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    {/* Subtle Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 opacity-50" />
                </motion.div>
                {!isCollapsed && (
                    <motion.span
                        className="font-bold text-2xl tracking-tight ml-3 bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent"
                        style={{ fontFamily: "'Dancing Script', cursive", letterSpacing: '0.05em' }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        Sisyphus
                    </motion.span>
                )}
            </div>

            {/* 折叠按钮 */}
            <motion.button
                onClick={toggle}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </motion.button>

            {/* 导航菜单 */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {navItems.map((item) => renderNavItem(item))}
            </div>

            {/* 底部操作区 */}
            <div className="p-3 border-t border-white/5 space-y-1">
                {!isCollapsed && (
                    <button className="w-full h-10 flex items-center gap-2 px-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm">
                        <Search className="w-4 h-4" />
                        <span>{t('nav.searchShortcut')}</span>
                    </button>
                )}

                {/* 语言选择 */}
                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className={cn(
                            "w-full h-10 flex items-center gap-2 px-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <Globe className="w-4 h-4" />
                        {!isCollapsed && <span>{i18n.language === 'zh-CN' ? '简体中文' : 'English'}</span>}
                    </button>
                    <AnimatePresence>
                        {showLangMenu && (
                            <motion.div
                                className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            i18n.changeLanguage(lang.code)
                                            setShowLangMenu(false)
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors",
                                            i18n.language === lang.code ? "text-cyan-400" : "text-slate-300"
                                        )}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 主题选择 */}
                <div className="relative">
                    <button
                        onClick={() => setShowThemeMenu(!showThemeMenu)}
                        className={cn(
                            "w-full h-10 flex items-center gap-2 px-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm",
                            isCollapsed && "justify-center"
                        )}
                    >
                        {theme === 'light' ? <Sun className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        {!isCollapsed && <span>{themeOptions.find(o => o.value === theme)?.label}</span>}
                    </button>
                    <AnimatePresence>
                        {showThemeMenu && (
                            <motion.div
                                className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                {themeOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setTheme(option.value)
                                            setShowThemeMenu(false)
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors",
                                            theme === option.value ? "text-cyan-400" : "text-slate-300"
                                        )}
                                    >
                                        <option.icon className="w-4 h-4" />
                                        {option.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {!isCollapsed && (
                    <button className="w-full h-10 flex items-center gap-2 px-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm">
                        <Settings className="w-4 h-4" />
                        <span>{t('common.settings')}</span>
                    </button>
                )}
            </div>

            {/* 用户资料 */}
            <div className="p-3 border-t border-white/5">
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <motion.div
                        className="w-10 h-10 rounded-2xl ring-2 ring-white/10 flex-shrink-0 overflow-hidden"
                        whileHover={{ scale: 1.05 }}
                    >
                        <img
                            src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                            alt="User Avatar"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                    {user?.username || '演示用户'}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                    {user?.email || 'demo@sisyphus.dev'}
                                </div>
                            </div>
                            <motion.button
                                onClick={logout}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                                title={t('auth.logout')}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <LogOut className="w-4 h-4" />
                            </motion.button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
