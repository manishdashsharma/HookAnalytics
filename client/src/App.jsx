import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  GitBranch, 
  MessageSquare, 
  Star, 
  GitPullRequest, 
  Bug, 
  Rocket, 
  Eye, 
  Trash2, 
  Plus,
  Search,
  Filter,
  Settings,
  BarChart3,
  Zap,
  Users,
  GitFork,
  Bell,
  Copy,
  Moon,
  Sun,
  ChevronUp,
  Wifi,
  WifiOff,
  Crown,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowUpRight
} from 'lucide-react';

const SOCKET_URL = 'http://localhost:4000';

function App() {
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL);
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to webhook server');
      setIsConnected(true);
      setIsLoading(false);
      socketInstance.emit('requestRecentEvents');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from webhook server');
      setIsConnected(false);
    });

    socketInstance.on('githubEvent', (eventData) => {
      console.log('New GitHub event received:', eventData);
      setEvents(prevEvents => [eventData, ...prevEvents.slice(0, 99)]);
      
      if (notifications && Notification.permission === 'granted') {
        new Notification(`GitHook Pro: ${eventData.eventType}`, {
          body: `${eventData.action ? eventData.action + ' in ' : ''}${eventData.repository.fullName}`,
          icon: eventData.sender.avatarUrl
        });
      }
    });

    socketInstance.on('recentEvents', (recentEvents) => {
      console.log('Received recent events:', recentEvents.length);
      setEvents(recentEvents);
      setIsLoading(false);
    });

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchStats();

    return () => {
      socketInstance.disconnect();
    };
  }, [notifications]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/stats`);
      const statsData = await response.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getEventIcon = (eventType) => {
    const iconMap = {
      push: GitBranch,
      pull_request: GitPullRequest,
      pull_request_review: Eye,
      pull_request_review_comment: MessageSquare,
      issue_comment: MessageSquare,
      issues: Bug,
      create: Plus,
      delete: Trash2,
      release: Rocket,
      fork: GitFork,
      star: Star,
      watch: Eye
    };
    return iconMap[eventType] || Activity;
  };

  const getEventColor = (eventType, action) => {
    if (eventType === 'pull_request') {
      switch (action) {
        case 'opened': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        case 'closed': return 'text-red-500 bg-red-500/10 border-red-500/20';
        case 'merged': return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
        default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      }
    }
    if (eventType === 'issues') {
      switch (action) {
        case 'opened': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        case 'closed': return 'text-red-500 bg-red-500/10 border-red-500/20';
        default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      }
    }
    return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredEvents = events.filter(event => {
    const matchesRepo = selectedRepo === 'all' || event.repository?.fullName === selectedRepo;
    const matchesType = selectedEventType === 'all' || event.eventType === selectedEventType;
    const matchesSearch = searchTerm === '' || 
      event.repository?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.sender?.login?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.metadata?.prTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRepo && matchesType && matchesSearch;
  });

  const uniqueRepos = [...new Set(events.map(e => e.repository?.fullName).filter(Boolean))];
  const uniqueEventTypes = [...new Set(events.map(e => e.eventType))];

  const tabs = [
    { id: 'dashboard', name: 'Overview', icon: BarChart3 },
    { id: 'events', name: 'Live Feed', icon: Zap },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  if (isLoading) {
    return (
      <div className={`min-h-screen ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
      } flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className={`w-16 h-16 border-4 ${
              isDarkMode 
                ? 'border-indigo-400 border-t-transparent' 
                : 'border-indigo-500 border-t-transparent'
            } rounded-full mx-auto mb-6`}
          />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            } mb-2 flex items-center justify-center gap-2`}>
              <Sparkles className="w-8 h-8 text-indigo-500" />
              GitHook Pro
            </h2>
            <p className={`${
              isDarkMode ? 'text-slate-400' : 'text-gray-600'
            } text-lg`}>
              Connecting to your webhook streams...
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
    }`}>
      <div className="flex h-screen">
        {/* Elegant Sidebar */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`w-72 ${
            isDarkMode 
              ? 'bg-slate-900/60 border-slate-800/50' 
              : 'bg-white/80 border-gray-200/50'
          } backdrop-blur-xl border-r flex flex-col`}
        >
          {/* Premium Brand Header */}
          <div className={`p-8 border-b ${isDarkMode ? 'border-slate-800/50' : 'border-gray-200/50'}`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <Crown className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <h1 className={`text-2xl font-bold bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-white to-slate-300' 
                    : 'from-gray-900 to-gray-700'
                } bg-clip-text text-transparent`}>
                  GitHook Pro
                </h1>
                <p className={`text-sm ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                } font-medium`}>
                  Webhook Intelligence Platform
                </p>
              </div>
            </motion.div>
          </div>

          {/* Refined Navigation */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full group flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`} />
                    <span>{tab.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="ml-auto w-2 h-2 bg-white rounded-full"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </nav>

          {/* Premium Connection Status */}
          <div className="p-6 border-t border-slate-800/50">
            <motion.div
              animate={{ scale: isConnected ? 1 : 0.98 }}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl border ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <motion.div className="relative">
                {isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-xs opacity-75">
                  {isConnected ? 'Receiving webhooks' : 'Connection lost'}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Premium Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sophisticated Header */}
          <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`${
              isDarkMode 
                ? 'bg-slate-900/40 border-slate-800/50' 
                : 'bg-white/60 border-gray-200/50'
            } backdrop-blur-xl border-b px-8 py-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {tabs.find(t => t.id === activeTab)?.name}
                </h2>
                <p className={`${
                  isDarkMode ? 'text-slate-400' : 'text-gray-600'
                } mt-1 font-medium`}>
                  Real-time GitHub webhook intelligence and analytics
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-3 rounded-xl ${
                    isDarkMode
                      ? 'bg-slate-800/50 text-amber-400 hover:bg-slate-700/50'
                      : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/80'
                  } transition-all duration-200`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 flex items-center space-x-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade Pro</span>
                </motion.button>
              </div>
            </div>
          </motion.header>

          {/* Premium Content Area */}
          <main className="flex-1 overflow-auto p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Premium Stats Grid */}
                  {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { 
                          label: 'Total Events', 
                          value: stats.totalEvents, 
                          icon: Activity, 
                          color: 'indigo',
                          change: '+12%',
                          trend: 'up'
                        },
                        { 
                          label: 'Last 24h', 
                          value: stats.recentEvents, 
                          icon: Clock, 
                          color: 'emerald',
                          change: '+8%',
                          trend: 'up'
                        },
                        { 
                          label: 'Event Types', 
                          value: stats.eventTypes.length, 
                          icon: TrendingUp, 
                          color: 'purple',
                          change: '+2',
                          trend: 'up'
                        },
                        { 
                          label: 'Active Repos', 
                          value: uniqueRepos.length, 
                          icon: GitBranch, 
                          color: 'amber',
                          change: '0%',
                          trend: 'neutral'
                        }
                      ].map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`${
                              isDarkMode 
                                ? 'bg-slate-900/40 border-slate-800/50' 
                                : 'bg-white/60 border-gray-200/50'
                            } backdrop-blur-xl rounded-2xl p-6 border relative overflow-hidden group`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${
                                  isDarkMode ? 'text-slate-400' : 'text-gray-600'
                                }`}>
                                  {stat.label}
                                </p>
                                <p className={`text-3xl font-bold mt-2 ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {stat.value.toLocaleString()}
                                </p>
                                <div className="flex items-center mt-3 space-x-1">
                                  <ArrowUpRight className={`w-3 h-3 ${
                                    stat.trend === 'up' ? 'text-emerald-500' : 'text-slate-400'
                                  }`} />
                                  <span className={`text-xs font-semibold ${
                                    stat.trend === 'up' ? 'text-emerald-500' : 'text-slate-400'
                                  }`}>
                                    {stat.change}
                                  </span>
                                </div>
                              </div>
                              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <Icon className={`w-6 h-6 text-${stat.color}-500`} />
                              </div>
                            </div>
                            
                            {/* Subtle gradient overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl`} />
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Enhanced Analytics Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Event Distribution */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${
                        isDarkMode 
                          ? 'bg-slate-900/40 border-slate-800/50' 
                          : 'bg-white/60 border-gray-200/50'
                      } backdrop-blur-xl rounded-2xl p-8 border`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Event Distribution
                        </h3>
                        <BarChart3 className={`w-5 h-5 ${
                          isDarkMode ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="space-y-4">
                        {stats?.eventTypes.slice(0, 6).map((type, index) => {
                          const Icon = getEventIcon(type._id);
                          const percentage = (type.count / stats.totalEvents) * 100;
                          return (
                            <motion.div
                              key={type._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between group"
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <div className={`w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                  <Icon className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex-1">
                                  <p className={`font-semibold ${
                                    isDarkMode ? 'text-slate-200' : 'text-gray-800'
                                  }`}>
                                    {type._id}
                                  </p>
                                  <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1`}>
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ delay: index * 0.1 + 0.3 }}
                                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full"
                                    />
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-bold ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {type.count}
                                  </p>
                                  <p className={`text-xs ${
                                    isDarkMode ? 'text-slate-400' : 'text-gray-500'
                                  }`}>
                                    {percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>

                    {/* Active Repositories */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${
                        isDarkMode 
                          ? 'bg-slate-900/40 border-slate-800/50' 
                          : 'bg-white/60 border-gray-200/50'
                      } backdrop-blur-xl rounded-2xl p-8 border`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Top Repositories
                        </h3>
                        <GitBranch className={`w-5 h-5 ${
                          isDarkMode ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="space-y-4">
                        {uniqueRepos.slice(0, 6).map((repo, index) => {
                          const eventCount = events.filter(e => e.repository?.fullName === repo).length;
                          return (
                            <motion.div
                              key={repo}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`flex items-center justify-between p-3 rounded-xl ${
                                isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-gray-100/50'
                              } transition-colors group cursor-pointer`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <div>
                                  <p className={`font-semibold ${
                                    isDarkMode ? 'text-slate-200' : 'text-gray-800'
                                  } group-hover:text-indigo-500 transition-colors`}>
                                    {repo.split('/')[1] || repo}
                                  </p>
                                  <p className={`text-xs ${
                                    isDarkMode ? 'text-slate-400' : 'text-gray-500'
                                  }`}>
                                    {repo.split('/')[0]}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {eventCount}
                                </p>
                                <p className={`text-xs ${
                                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                                }`}>
                                  events
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'events' && (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Enhanced Filters */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-800/50' 
                        : 'bg-white/60 border-gray-200/50'
                    } backdrop-blur-xl rounded-2xl p-6 border`}
                  >
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-80 relative">
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                          isDarkMode ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="text"
                          placeholder="Search events, repositories, or users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                            isDarkMode
                              ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-400'
                              : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500'
                          } focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200`}
                        />
                      </div>
                      
                      <div className="relative">
                        <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                          isDarkMode ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                        <select
                          value={selectedRepo}
                          onChange={(e) => setSelectedRepo(e.target.value)}
                          className={`pl-10 pr-8 py-3 rounded-xl border appearance-none ${
                            isDarkMode
                              ? 'bg-slate-800/50 border-slate-700/50 text-white'
                              : 'bg-white/80 border-gray-300/50 text-gray-900'
                          } focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200`}
                        >
                          <option value="all">All Repositories</option>
                          {uniqueRepos.map(repo => (
                            <option key={repo} value={repo}>{repo}</option>
                          ))}
                        </select>
                      </div>
                      
                      <select
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                        className={`px-4 py-3 rounded-xl border ${
                          isDarkMode
                            ? 'bg-slate-800/50 border-slate-700/50 text-white'
                            : 'bg-white/80 border-gray-300/50 text-gray-900'
                        } focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200`}
                      >
                        <option value="all">All Event Types</option>
                        {uniqueEventTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>

                  {/* Premium Events List */}
                  <motion.div
                    className={`${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-800/50' 
                        : 'bg-white/60 border-gray-200/50'
                    } backdrop-blur-xl rounded-2xl border overflow-hidden`}
                  >
                    <div className="p-6 border-b border-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Zap className="w-6 h-6 text-indigo-500" />
                          <h3 className={`text-xl font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Live Events Feed
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            isDarkMode 
                              ? 'bg-indigo-500/20 text-indigo-400' 
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {filteredEvents.length}
                          </span>
                        </div>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full"
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-[600px] overflow-y-auto">
                      <AnimatePresence>
                        {filteredEvents.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-12 text-center"
                          >
                            <Activity className={`w-16 h-16 ${
                              isDarkMode ? 'text-slate-600' : 'text-gray-400'
                            } mx-auto mb-4`} />
                            <h3 className={`text-xl font-bold mb-2 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              No events found
                            </h3>
                            <p className={`${
                              isDarkMode ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                              Waiting for GitHub webhooks or try adjusting your filters
                            </p>
                          </motion.div>
                        ) : (
                          <div className={`divide-y ${
                            isDarkMode ? 'divide-slate-800/50' : 'divide-gray-200/50'
                          }`}>
                            {filteredEvents.map((event, index) => {
                              const Icon = getEventIcon(event.eventType);
                              return (
                                <motion.div
                                  key={event.id || index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ delay: index * 0.05 }}
                                  whileHover={{ scale: 1.01, x: 4 }}
                                  className={`p-6 hover:${
                                    isDarkMode ? 'bg-slate-800/20' : 'bg-gray-50/50'
                                  } transition-all duration-200 cursor-pointer group relative`}
                                >
                                  <div className="flex items-start space-x-4">
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        getEventColor(event.eventType, event.action)
                                      } border`}
                                    >
                                      <Icon className="w-5 h-5" />
                                    </motion.div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <span className={`font-bold text-lg ${
                                          isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {event.eventType.replace('_', ' ')}
                                        </span>
                                        {event.action && (
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                                            getEventColor(event.eventType, event.action)
                                          }`}>
                                            {event.action}
                                          </span>
                                        )}
                                        <span className={`text-sm ${
                                          isDarkMode ? 'text-slate-400' : 'text-gray-500'
                                        } font-medium`}>
                                          {formatTimestamp(event.timestamp)}
                                        </span>
                                      </div>
                                      
                                      <div className="mb-3">
                                        <span className={`font-semibold text-lg ${
                                          isDarkMode ? 'text-slate-200' : 'text-gray-800'
                                        }`}>
                                          {event.repository?.fullName || 'Unknown Repository'}
                                        </span>
                                        {event.metadata?.branch && (
                                          <span className="ml-3 px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold border border-indigo-500/30">
                                            {event.metadata.branch}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {event.metadata?.prTitle && (
                                        <p className={`font-semibold mb-2 text-lg ${
                                          isDarkMode ? 'text-slate-200' : 'text-gray-800'
                                        }`}>
                                          {event.metadata.prTitle}
                                        </p>
                                      )}
                                      
                                      {event.metadata?.prBody && (
                                        <p className={`text-sm mb-3 ${
                                          isDarkMode ? 'text-slate-400' : 'text-gray-600'
                                        } line-clamp-2 leading-relaxed`}>
                                          {event.metadata.prBody}
                                        </p>
                                      )}
                                      
                                      {event.metadata?.commentBody && (
                                        <motion.div
                                          whileHover={{ scale: 1.01 }}
                                          className={`${
                                            isDarkMode 
                                              ? 'bg-slate-800/30 border-slate-700/30' 
                                              : 'bg-gray-100/60 border-gray-200/60'
                                          } rounded-xl p-4 mb-3 border`}
                                        >
                                          <p className={`text-sm italic ${
                                            isDarkMode ? 'text-slate-300' : 'text-gray-700'
                                          } leading-relaxed`}>
                                            "{event.metadata.commentBody.length > 150 
                                              ? event.metadata.commentBody.substring(0, 150) + '...' 
                                              : event.metadata.commentBody}"
                                          </p>
                                        </motion.div>
                                      )}
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                          <span className={`text-sm font-medium ${
                                            isDarkMode ? 'text-slate-400' : 'text-gray-500'
                                          }`}>
                                            by {event.sender?.login || 'Unknown'}
                                          </span>
                                          {(event.metadata?.pullRequestNumber || event.metadata?.issueNumber) && (
                                            <span className={`text-sm font-mono px-2 py-1 rounded ${
                                              isDarkMode 
                                                ? 'bg-slate-700/50 text-slate-300' 
                                                : 'bg-gray-200/50 text-gray-600'
                                            }`}>
                                              #{event.metadata?.pullRequestNumber || event.metadata?.issueNumber}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {event.sender?.avatarUrl && (
                                      <motion.img
                                        whileHover={{ scale: 1.1 }}
                                        src={event.sender.avatarUrl}
                                        alt={event.sender.login || 'User'}
                                        className="w-12 h-12 rounded-xl ring-2 ring-indigo-500/20 shadow-lg"
                                      />
                                    )}
                                  </div>
                                  
                                  {/* Subtle hover indicator */}
                                  <div className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-r`} />
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-20"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <TrendingUp className={`w-20 h-20 ${
                      isDarkMode ? 'text-slate-600' : 'text-gray-400'
                    } mx-auto mb-6`} />
                    <h3 className={`text-3xl font-bold mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Advanced Analytics Suite
                    </h3>
                    <p className={`${
                      isDarkMode ? 'text-slate-400' : 'text-gray-500'
                    } text-lg mb-8 max-w-md mx-auto leading-relaxed`}>
                      Unlock powerful insights with advanced metrics, custom dashboards, and predictive analytics.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25 flex items-center space-x-2 mx-auto"
                    >
                      <Crown className="w-5 h-5" />
                      <span>Upgrade to Pro</span>
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Webhook Configuration */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-800/50' 
                        : 'bg-white/60 border-gray-200/50'
                    } backdrop-blur-xl rounded-2xl p-8 border`}
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <Settings className="w-6 h-6 text-indigo-500" />
                      <h3 className={`text-2xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Webhook Configuration
                      </h3>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className={`block text-sm font-semibold mb-3 ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Webhook URL
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            value={`${SOCKET_URL}/webhook`}
                            readOnly
                            className={`flex-1 px-4 py-3 rounded-l-xl border ${
                              isDarkMode
                                ? 'bg-slate-800/50 border-slate-700/50 text-white'
                                : 'bg-gray-50/80 border-gray-300/50 text-gray-900'
                            } font-mono text-sm`}
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigator.clipboard.writeText(`${SOCKET_URL}/webhook`)}
                            className="px-6 py-3 bg-indigo-500 text-white rounded-r-xl hover:bg-indigo-600 transition-colors flex items-center space-x-2"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </motion.button>
                        </div>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-semibold mb-3 ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Content Type
                        </label>
                        <input
                          type="text"
                          value="application/json"
                          readOnly
                          className={`w-full px-4 py-3 rounded-xl border ${
                            isDarkMode
                              ? 'bg-slate-800/50 border-slate-700/50 text-white'
                              : 'bg-gray-50/80 border-gray-300/50 text-gray-900'
                          } font-mono text-sm`}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Notification Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-800/50' 
                        : 'bg-white/60 border-gray-200/50'
                    } backdrop-blur-xl rounded-2xl p-8 border`}
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <Bell className="w-6 h-6 text-indigo-500" />
                      <h3 className={`text-2xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Notification Preferences
                      </h3>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/30">
                        <div>
                          <p className={`font-semibold text-lg ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Browser Notifications
                          </p>
                          <p className={`text-sm ${
                            isDarkMode ? 'text-slate-400' : 'text-gray-500'
                          } mt-1`}>
                            Get instant notifications for new webhook events
                          </p>
                        </div>
                        <motion.div
                          whileTap={{ scale: 0.95 }}
                          className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors ${
                            notifications
                              ? 'bg-emerald-500'
                              : isDarkMode ? 'bg-slate-600' : 'bg-gray-400'
                          }`}
                          onClick={() => setNotifications(!notifications)}
                        >
                          <motion.div
                            animate={{ x: notifications ? 28 : 0 }}
                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                          />
                        </motion.div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/30">
                        <div>
                          <p className={`font-semibold text-lg ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Dark Mode
                          </p>
                          <p className={`text-sm ${
                            isDarkMode ? 'text-slate-400' : 'text-gray-500'
                          } mt-1`}>
                            Toggle between dark and light theme
                          </p>
                        </div>
                        <motion.div
                          whileTap={{ scale: 0.95 }}
                          className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors ${
                            isDarkMode
                              ? 'bg-indigo-500'
                              : 'bg-gray-400'
                          }`}
                          onClick={() => setIsDarkMode(!isDarkMode)}
                        >
                          <motion.div
                            animate={{ x: isDarkMode ? 28 : 0 }}
                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                          />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Supported Events */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-800/50' 
                        : 'bg-white/60 border-gray-200/50'
                    } backdrop-blur-xl rounded-2xl p-8 border`}
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <Zap className="w-6 h-6 text-indigo-500" />
                      <h3 className={`text-2xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Supported Event Types
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        { type: 'push', icon: GitBranch },
                        { type: 'pull_request', icon: GitPullRequest },
                        { type: 'pull_request_review', icon: Eye },
                        { type: 'pull_request_review_comment', icon: MessageSquare },
                        { type: 'issue_comment', icon: MessageSquare },
                        { type: 'issues', icon: Bug },
                        { type: 'create', icon: Plus },
                        { type: 'delete', icon: Trash2 },
                        { type: 'release', icon: Rocket },
                        { type: 'fork', icon: GitFork },
                        { type: 'star', icon: Star },
                        { type: 'watch', icon: Eye }
                      ].map((event, index) => {
                        const Icon = event.icon;
                        return (
                          <motion.div
                            key={event.type}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            className={`flex items-center space-x-3 p-4 rounded-xl border ${
                              isDarkMode 
                                ? 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/30' 
                                : 'bg-gray-100/50 border-gray-200/50 hover:bg-gray-200/50'
                            } transition-all cursor-pointer group`}
                          >
                            <Icon className={`w-5 h-5 ${
                              isDarkMode ? 'text-slate-400 group-hover:text-indigo-400' : 'text-gray-500 group-hover:text-indigo-500'
                            } transition-colors`} />
                            <span className={`text-sm font-semibold ${
                              isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'
                            } transition-colors`}>
                              {event.type.replace('_', ' ')}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        className="fixed bottom-8 right-8"
      >
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-xl shadow-indigo-500/25 flex items-center justify-center backdrop-blur-xl border border-white/10"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ChevronUp className="w-6 h-6" />
        </motion.button>
      </motion.div>

      {/* Custom Styles */}
      <style jsx>{`
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(107, 114, 128, 0.3)'};
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(107, 114, 128, 0.5)'};
        }
      `}</style>
    </div>
  );
}

export default App;