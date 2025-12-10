import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Globe, TrendingUp } from 'lucide-react';

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI assistant with real-time web search. I can help you with current news, trends, products, and any up-to-date information. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build the API payload with web search tool
      const payload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        tools: searchEnabled ? [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ] : []
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      // Handle tool use and responses
      if (data.content) {
        let fullResponse = '';
        let hasToolUse = false;
        
        // Check if Claude used web search
        for (const block of data.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          } else if (block.type === 'tool_use') {
            hasToolUse = true;
          }
        }

        // If Claude used tools, we need to continue the conversation
        if (hasToolUse && data.stop_reason === 'tool_use') {
          // Add a status message
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '🔍 Searching the web for the latest information...',
            isSearching: true
          }]);

          // Continue the conversation with tool results
          const continuePayload = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [
              ...messages,
              userMessage,
              {
                role: 'assistant',
                content: data.content
              },
              {
                role: 'user',
                content: data.content
                  .filter(block => block.type === 'tool_use')
                  .map(block => ({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: 'Search completed successfully'
                  }))
              }
            ],
            tools: payload.tools
          };

          const continueResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(continuePayload)
          });

          const continueData = await continueResponse.json();
          
          if (continueData.content) {
            fullResponse = continueData.content
              .filter(block => block.type === 'text')
              .map(block => block.text)
              .join('\n');
          }

          // Remove searching message and add final response
          setMessages(prev => {
            const filtered = prev.filter(msg => !msg.isSearching);
            return [...filtered, {
              role: 'assistant',
              content: fullResponse || 'I found some information, but had trouble formatting the response. Please try again.'
            }];
          });
        } else {
          // No tool use, just add the response
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fullResponse || 'I received your message but had trouble generating a response. Please try again.'
          }]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isSearching);
        return [...filtered, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Hello! I\'m your AI assistant with real-time web search. I can help you with current news, trends, products, and any up-to-date information. How can I help you today?' }
    ]);
  };

  const suggestedQueries = [
    "What's the latest tech news today?",
    "Show me trending products on Amazon",
    "What are the current world news headlines?",
    "What's trending on social media?",
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg border-b border-purple-500/20 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Chatbot with Web Search</h1>
              <p className="text-xs text-purple-300 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Real-time data enabled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchEnabled(!searchEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                searchEnabled 
                  ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
                  : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">{searchEnabled ? 'Search ON' : 'Search OFF'}</span>
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Suggested Queries */}
          {messages.length === 1 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-purple-300">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Try asking about:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(query)}
                    className="text-left p-3 bg-black/40 backdrop-blur-lg border border-purple-500/20 rounded-lg hover:bg-black/60 transition-colors text-sm text-gray-300"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    : message.isSearching
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : message.isSearching ? (
                  <Globe className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div
                className={`flex-1 max-w-2xl p-4 rounded-2xl shadow-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white'
                    : message.isSearching
                    ? 'bg-gradient-to-br from-green-600/40 to-emerald-600/40 backdrop-blur-lg text-green-100 border border-green-500/30'
                    : 'bg-black/40 backdrop-blur-lg text-gray-100 border border-purple-500/20'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 max-w-2xl p-4 rounded-2xl bg-black/40 backdrop-blur-lg border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-black/30 backdrop-blur-lg border-t border-purple-500/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about latest news, trends, products, or anything current..."
              className="flex-1 bg-white/10 backdrop-blur-lg border border-purple-500/30 rounded-2xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl px-6 py-3 flex items-center justify-center transition-all shadow-lg hover:shadow-purple-500/50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-purple-300/60 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line • Web search is {searchEnabled ? 'enabled' : 'disabled'}
          </p>
        </div>
      </div>
    </div>
  );
}
