import React, { useEffect, useState } from 'react';
import { useApiConfigStore } from '../stores/apiConfigStore';
import InitialSetupWizard from './InitialSetupWizard';
import ApiSettingsPage from './ApiSettingsPage';

interface AppConfigWrapperProps {
  children: React.ReactNode;
}

const AppConfigWrapper: React.FC<AppConfigWrapperProps> = ({ children }) => {
  const {
    systemStatus,
    isInitialSetup,
    fetchSystemStatus,
    clearError
  } = useApiConfigStore();

  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await fetchSystemStatus();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [fetchSystemStatus]);

  useEffect(() => {
    if (systemStatus && !isLoading) {
      if (systemStatus.needs_initial_setup) {
        setShowWizard(true);
      }
    }
  }, [systemStatus, isLoading]);

  const handleWizardComplete = () => {
    setShowWizard(false);
    clearError();
    // 重新获取系统状态
    fetchSystemStatus();
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">正在初始化系统...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 主应用内容 */}
      <div className="relative">
        {/* 设置按钮 */}
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={openSettings}
            className="p-3 bg-white border border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            title="API设置"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* 系统状态指示器 */}
        {systemStatus && !systemStatus.has_active_config && !showWizard && (
          <div className="fixed bottom-4 right-4 z-40">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
              <div className="flex items-center">
                <div className="text-yellow-400 mr-3">⚠️</div>
                <div>
                  <p className="text-yellow-800 font-medium text-sm">未检测到活动配置</p>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="text-yellow-700 hover:text-yellow-900 text-sm underline mt-1"
                  >
                    点击配置API密钥
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {children}
      </div>

      {/* 初始设置向导 */}
      {showWizard && (
        <InitialSetupWizard onComplete={handleWizardComplete} />
      )}

      {/* 设置页面模态框 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-screen overflow-hidden m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">API配置设置</h2>
              <button
                onClick={closeSettings}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
              <ApiSettingsPage />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppConfigWrapper;