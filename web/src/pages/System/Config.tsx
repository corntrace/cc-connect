import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode, RefreshCw, RotateCcw, Settings2, ChevronDown, ChevronRight, ScrollText } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { restartSystem, reloadConfig } from '@/api/status';
import api from '@/api/client';
import GlobalSettings from './GlobalSettings';
import changelogText from '@/content/changelog.zh-CN.md?raw';

type SystemTab = 'settings' | 'changelog';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-700 dark:bg-white/[0.08] dark:text-gray-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function ChangelogView() {
  const lines = changelogText.trim().split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    nodes.push(
      <ul key={`list-${nodes.length}`} className="space-y-2.5 pl-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
        {items.map((item, index) => (
          <li key={index} className="list-disc marker:text-accent">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();

    if (trimmed.startsWith('# ')) {
      nodes.push(
        <div key={`h1-${nodes.length}`} className="flex items-center gap-2">
          <ScrollText size={18} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{trimmed.slice(2)}</h2>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h3 key={`h2-${nodes.length}`} className="pt-4 text-sm font-semibold text-gray-900 dark:text-white">
          {trimmed.slice(3)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h4 key={`h3-${nodes.length}`} className="pt-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          {trimmed.slice(4)}
        </h4>
      );
      return;
    }

    nodes.push(
      <p key={`p-${nodes.length}`} className="text-sm leading-6 text-gray-700 dark:text-gray-300">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();

  return (
    <Card>
      <div className="space-y-4">{nodes}</div>
    </Card>
  );
}

export default function SystemConfig() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SystemTab>('settings');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'toml' | 'json'>('toml');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const text = await api.raw('/config');
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const obj = JSON.parse(trimmed);
          setContent(JSON.stringify(obj, null, 2));
          setFormat('json');
        } catch {
          setContent(text);
          setFormat('toml');
        }
      } else {
        setContent(text);
        setFormat('toml');
      }
    } catch {
      setContent('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const handler = () => fetchConfig();
    window.addEventListener('cc:refresh', handler);
    return () => window.removeEventListener('cc:refresh', handler);
  }, [fetchConfig]);

  const handleRestart = async () => {
    if (!confirm(t('system.restartConfirm'))) return;
    try {
      await restartSystem();
      setActionMsg(t('common.success'));
    } catch (e: any) {
      setActionMsg(e.message);
    }
  };

  const handleReload = async () => {
    if (!confirm(t('system.reloadConfirm'))) return;
    try {
      await reloadConfig();
      setActionMsg(t('common.success'));
      fetchConfig();
    } catch (e: any) {
      setActionMsg(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in ">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'border-accent text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Settings2 size={16} />
          {t('system.config')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('changelog')}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'changelog'
              ? 'border-accent text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ScrollText size={16} />
          {t('system.changelog', '更新日志')}
        </button>
      </div>

      {activeTab === 'settings' ? (
        <>
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleReload}><RefreshCw size={16} /> {t('system.reload')}</Button>
            <Button variant="danger" onClick={handleRestart}><RotateCcw size={16} /> {t('system.restart')}</Button>
          </div>

          {actionMsg && (
            <div className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">{actionMsg}</div>
          )}

          {/* Global Settings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings2 size={16} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.title', 'Global Settings')}</h2>
            </div>
            <GlobalSettings />
          </div>

          {/* Raw Config (collapsible) */}
          <Card>
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 w-full text-left"
            >
              {showRaw ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              <FileCode size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('system.rawConfig', 'Raw Config')}</h3>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">
                {format}
              </span>
            </button>
            {showRaw && (
              <div className="mt-3">
                {loading ? (
                  <div className="text-gray-400 animate-pulse text-sm">Loading...</div>
                ) : (
                  <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 overflow-auto max-h-[65vh] font-mono leading-relaxed whitespace-pre">
                    {content || t('common.noData')}
                  </pre>
                )}
              </div>
            )}
          </Card>
        </>
      ) : (
        <ChangelogView />
      )}
    </div>
  );
}
