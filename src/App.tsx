import React, { useState, useEffect, useRef } from 'react';
import { Settings, Send, Bot, KeyRound, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askGemini } from './lib/gemini';
import './index.css';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('gemini_api_key'));
  const [tempKey, setTempKey] = useState(apiKey);

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'こんにちは！ちょこっと製本工房のサポートAIです。製本やご注文について何かご質問はございますか？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempKey.trim()) {
      localStorage.setItem('gemini_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowSettings(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const userText = input.trim();
    setInput('');

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const historyMsg = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await askGemini(userText, apiKey, historyMsg);

      const newBotMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
      setMessages(prev => [...prev, newBotMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title">
          <Bot size={28} color="var(--primary-color)" />
          ちょこっとAIサポート
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            setTempKey(apiKey);
            setShowSettings(true);
          }}
          title="Settings"
        >
          <Settings size={22} />
        </button>
      </header>

      <main className="chat-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
            <div className="message-bubble">
              {msg.role === 'model' ? (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper ai">
            <div className="message-bubble loading">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className="input-area">
        <form className="input-container" onSubmit={handleSend}>
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '0.875rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <a href="https://www.chokotto.jp/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ちょこっと(ちょ古っ都)製本工房 公式サイト <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">APIキーの設定</h2>
              <p className="modal-desc">
                チャットボットを利用するには、Google Gemini APIキーが必要です。
                入力されたキーはブラウザ上(localStorage)にのみ保存されます。
              </p>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label">Gemini API Key</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {apiKey && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                    onClick={() => setShowSettings(false)}
                  >
                    キャンセル
                  </button>
                )}
                <button type="submit" className="btn-primary">保存して開始</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
