import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
})();

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [tickers, setTickers] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('WS connected');
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'ticker' }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'signals' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'update' || msg.type === 'ticker') {
            if (msg.tickers) setTickers(msg.tickers);
            if (msg.signals) setSignals(msg.signals);
          }
          if (msg.type === 'signals' && msg.data) {
            setSignals(msg.data);
          }
        } catch (e) {
          console.error('WS message parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('WS disconnected, reconnecting...');
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS error:', err);
        ws.close();
      };
    } catch (err) {
      console.error('WS connection error:', err);
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { connected, tickers, signals };
}
