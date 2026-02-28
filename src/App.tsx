import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askGemini } from './lib/gemini';
import './index.css';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const historyMsg = messages.map(m => ({ role: m.role, text: m.text }));
      // Using the backend proxy now, no API key needed from the frontend
      const responseText = await askGemini(userText, historyMsg);

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
    // 日本語変換中（IME入力中）のエンターキーは送信処理をスキップする
    // デバイスやブラウザによっては isComposing が false になることがあるため、keyCode 229 等も併用して判定します
    if (e.nativeEvent.isComposing || e.key === 'Process' || e.keyCode === 229) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-container">
      <header className="header" style={{ justifyContent: 'center' }}>
        <div className="header-title">
          <Bot size={28} color="var(--primary-color)" />
          ちょこっとAIサポート
        </div>
      </header>

      <main className="chat-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
            <div className="message-bubble">
              {msg.role === 'model' ? (
                <div className="markdown-body">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                      )
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
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
    </div>
  );
}
