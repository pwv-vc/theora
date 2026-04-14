/** @jsxImportSource hono/jsx */
import type { LlmCallLog } from '../../../lib/llm-stats.js'
import { formatCostWithSource } from './utils.js'
import { formatDuration } from '../../../lib/utils.js'

interface LogTailerProps {
  recentLogs: LlmCallLog[]
}

function formatLogEntry(log: LlmCallLog) {
  const time = new Date(log.timestamp).toLocaleTimeString()
  return (
    <tr class="border-b last:border-0 border-zinc-800">
      <td class="py-2 font-mono text-xs text-zinc-300">{time}</td>
      <td class="py-2 capitalize text-zinc-300">{log.action}</td>
      <td class="py-2 text-zinc-400 text-xs">{log.meta ?? ''}</td>
      <td class="py-2 text-zinc-400 text-xs">{log.provider}</td>
      <td class="py-2 font-mono text-xs text-zinc-300">{log.model}</td>
      <td class="text-right py-2 text-zinc-300">{log.inputTokens}+{log.outputTokens}</td>
      <td class="text-right py-2 text-zinc-300">{formatCostWithSource(log.estimatedCostUsd, log.costSource)}</td>
      <td class="text-right py-2 text-zinc-300">{formatDuration(log.durationMs)}</td>
    </tr>
  )
}

export function LogTailer({ recentLogs }: LogTailerProps) {
  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 no-scanline relative z-[10001]">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-zinc-100">Live Log Tailer</h2>
        <div class="flex items-center gap-2">
          <span id="log-status" class="text-sm text-zinc-500">Connecting...</span>
          <span id="log-indicator" class="w-2 h-2 rounded-full bg-yellow-400"></span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800">
              <th class="text-left py-2 text-zinc-400 font-medium">Time</th>
              <th class="text-left py-2 text-zinc-400 font-medium">Action</th>
              <th class="text-left py-2 text-zinc-400 font-medium">Meta</th>
              <th class="text-left py-2 text-zinc-400 font-medium">Provider</th>
              <th class="text-left py-2 text-zinc-400 font-medium">Model</th>
              <th class="text-right py-2 text-zinc-400 font-medium">Tokens</th>
              <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
              <th class="text-right py-2 text-zinc-400 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody id="log-tbody">
            {recentLogs.slice().reverse().map(log => formatLogEntry(log))}
          </tbody>
        </table>
      </div>
      <script dangerouslySetInnerHTML={{
        __html: `
            const logTbody = document.getElementById('log-tbody');
            const logStatus = document.getElementById('log-status');
            const logIndicator = document.getElementById('log-indicator');
            const maxRows = 50;

            function formatCost(usd) {
              if (usd < 0.01) return '$' + usd.toFixed(4);
              return '$' + usd.toFixed(2);
            }

            function formatDuration(ms) {
              if (ms < 1000) return ms + 'ms';
              if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
              const mins = Math.floor(ms / 60000);
              const secs = Math.floor((ms % 60000) / 1000);
              return mins + 'm ' + secs + 's';
            }

            function addLogEntry(log) {
              const row = document.createElement('tr');
              row.className = 'border-b last:border-0 border-zinc-800 animate-fade-in';
              const time = new Date(log.timestamp).toLocaleTimeString();
              const cells = [
                { text: time, cls: 'py-2 font-mono text-xs text-zinc-300' },
                { text: String(log.action), cls: 'py-2 capitalize text-zinc-300' },
                { text: log.meta ?? '', cls: 'py-2 text-zinc-400 text-xs' },
                { text: String(log.provider), cls: 'py-2 text-zinc-400 text-xs' },
                { text: String(log.model), cls: 'py-2 font-mono text-xs text-zinc-300' },
                { text: String(log.inputTokens) + '+' + String(log.outputTokens), cls: 'text-right py-2 text-zinc-300' },
                { text: formatCost(log.estimatedCostUsd), cls: 'text-right py-2 text-zinc-300' },
                { text: formatDuration(log.durationMs), cls: 'text-right py-2 text-zinc-300' },
              ];
              cells.forEach(function(cell) {
                const td = document.createElement('td');
                td.className = cell.cls;
                td.textContent = cell.text;
                row.appendChild(td);
              });
              logTbody.insertBefore(row, logTbody.firstChild);

              // Remove old rows
              while (logTbody.children.length > maxRows) {
                logTbody.removeChild(logTbody.lastChild);
              }
            }

            // Connect to SSE endpoint
            let evtSource = null;
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 5;

            function connect() {
              if (evtSource) {
                evtSource.close();
              }

              evtSource = new EventSource('/api/logs/stream');

              evtSource.onopen = function() {
                logStatus.textContent = 'Live';
                logStatus.className = 'text-sm text-zinc-500';
                logIndicator.className = 'w-2 h-2 rounded-full bg-green-500 animate-pulse';
                reconnectAttempts = 0;
              };

              evtSource.onmessage = function(event) {
                try {
                  const data = JSON.parse(event.data);
                  // Skip heartbeat/connection messages
                  if (data.type === 'connected') return;
                  addLogEntry(data);
                } catch (e) {
                  console.error('Failed to parse log:', e);
                }
              };

              evtSource.onerror = function() {
                logStatus.textContent = 'Disconnected';
                logStatus.className = 'text-sm text-zinc-500';
                logIndicator.className = 'w-2 h-2 rounded-full bg-red-500';

                // Attempt to reconnect with exponential backoff
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
                  logStatus.textContent = 'Reconnecting...';
                  logStatus.className = 'text-sm text-zinc-500';
                  setTimeout(connect, delay);
                }
              };
            }

            // Initial connection
            connect();

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
              if (evtSource) {
                evtSource.close();
              }
            });
          `
      }} />
      <style dangerouslySetInnerHTML={{
        __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
              animation: fadeIn 0.3s ease-out;
            }
          `
      }} />
    </div>
  )
}
