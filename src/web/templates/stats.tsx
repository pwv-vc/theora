/** @jsxImportSource hono/jsx */
import type { StatsSummary, LlmCallLog } from '../../lib/llm-stats.js'
import type { KbConfig } from '../../lib/config.js'
import { PageHeader } from './ui/index.js'

interface StatsPageProps {
  summary: StatsSummary
  days: number
  recentLogs: LlmCallLog[]
  config: KbConfig
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(2)}`
  return `$${usd.toFixed(2)}`
}

function formatLogEntry(log: LlmCallLog) {
  const time = new Date(log.timestamp).toLocaleTimeString()
  return (
    <tr class="border-b last:border-0 border-zinc-800">
      <td class="py-2 font-mono text-xs text-zinc-300">{time}</td>
      <td class="py-2 capitalize text-zinc-300">{log.action}</td>
      <td class="py-2 text-zinc-400 text-xs">{log.meta ?? ''}</td>
      <td class="py-2 font-mono text-xs text-zinc-300">{log.model}</td>
      <td class="text-right py-2 text-zinc-300">{log.inputTokens}+{log.outputTokens}</td>
      <td class="text-right py-2 text-zinc-300">{formatCost(log.estimatedCostUsd)}</td>
      <td class="text-right py-2 text-zinc-300">{log.durationMs}ms</td>
    </tr>
  )
}

export function StatsPage({ summary, days, recentLogs, config }: StatsPageProps) {
  const actionEntries = Object.entries(summary.byAction).sort((a, b) => b[1].calls - a[1].calls)
  const modelEntries = Object.entries(summary.byModel).sort((a, b) => b[1].calls - a[1].calls)
  const actionPerModelEntries = Object.entries(summary.byActionPerModel).sort((a, b) => a[0].localeCompare(b[0]))
  const dayEntries = Object.entries(summary.byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)

  return (
    <div>
      <PageHeader title="Stats" subtitle={`Usage and logs for the ${config.name} wiki.`} />

      <div class="flex items-center justify-end mb-8 gap-2">
        <a href="/stats?days=7" class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 7 ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-transparent text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'}`}>7 days</a>
        <a href="/stats?days=30" class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 30 ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-transparent text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'}`}>30 days</a>
        <a href="/stats?days=90" class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 90 ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-transparent text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'}`}>90 days</a>
      </div>

      {/* Overview Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 no-scanline relative z-[10001]">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">Total Calls</div>
          <div class="text-zinc-100 text-2xl font-bold">{summary.totalCalls.toLocaleString()}</div>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 no-scanline relative z-[10001]">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">Total Tokens</div>
          <div class="text-zinc-100 text-2xl font-bold">{formatTokens(summary.totalInputTokens + summary.totalOutputTokens)}</div>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 no-scanline relative z-[10001]">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">AI Time</div>
          <div class="text-zinc-100 text-2xl font-bold">{formatDuration(summary.totalDurationMs)}</div>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 no-scanline relative z-[10001]">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">Est. Cost</div>
          <div class="text-zinc-100 text-2xl font-bold">{formatCost(summary.totalCostUsd)}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Action */}
        {actionEntries.length > 0 && (
          <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 no-scanline relative z-[10001]">
            <h2 class="text-lg font-semibold mb-4 text-zinc-100">By Action</h2>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800">
                  <th class="text-left py-2 text-zinc-400 font-medium">Action</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {actionEntries.map(([action, stats]) => (
                  <tr key={action} class="border-b last:border-0 border-zinc-800">
                    <td class="py-2 capitalize text-zinc-300">{action}</td>
                    <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
                    <td class="text-right py-2 text-zinc-300">{formatCost(stats.costUsd)}</td>
                    <td class="text-right py-2 text-zinc-300">{formatTokens(stats.inputTokens + stats.outputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* By Model */}
        {modelEntries.length > 0 && (
          <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 no-scanline relative z-[10001]">
            <h2 class="text-lg font-semibold mb-4 text-zinc-100">By Model</h2>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800">
                  <th class="text-left py-2 text-zinc-400 font-medium">Model</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelEntries.map(([model, stats]) => (
                  <tr key={model} class="border-b last:border-0 border-zinc-800">
                    <td class="py-2 font-mono text-xs text-zinc-300">{model}</td>
                    <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
                    <td class="text-right py-2 text-zinc-300">{formatCost(stats.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* By Action per Model */}
      {actionPerModelEntries.length > 0 && (
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 no-scanline relative z-[10001]">
          <h2 class="text-lg font-semibold mb-4 text-zinc-100">By Action per Model</h2>
          <div class="space-y-4">
            {actionPerModelEntries.map(([action, models]) => {
              const modelEntries = Object.entries(models).sort((a, b) => b[1].calls - a[1].calls)
              return (
                <div key={action} class="border-b last:border-0 border-zinc-800 pb-4 last:pb-0">
                  <h3 class="font-medium text-zinc-300 capitalize mb-2">{action}</h3>
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-zinc-800">
                        <th class="text-left py-1 text-zinc-400 font-medium">Model</th>
                        <th class="text-right py-1 text-zinc-400 font-medium">Calls</th>
                        <th class="text-right py-1 text-zinc-400 font-medium">Cost</th>
                        <th class="text-right py-1 text-zinc-400 font-medium">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelEntries.map(([model, stats]) => (
                        <tr key={model} class="border-b last:border-0 border-zinc-800">
                          <td class="py-1 font-mono text-xs text-zinc-300">{model}</td>
                          <td class="text-right py-1 text-zinc-300">{stats.calls}</td>
                          <td class="text-right py-1 text-zinc-300">{formatCost(stats.costUsd)}</td>
                          <td class="text-right py-1 text-zinc-300">{formatTokens(stats.inputTokens + stats.outputTokens)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily Activity */}
      {dayEntries.length > 0 && (
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 no-scanline relative z-[10001]">
          <h2 class="text-lg font-semibold mb-4 text-zinc-100">Daily Activity</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800">
                  <th class="text-left py-2 text-zinc-400 font-medium">Date</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
                  <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {dayEntries.map(([day, stats]) => (
                  <tr key={day} class="border-b last:border-0 border-zinc-800">
                    <td class="py-2 text-zinc-300">{day}</td>
                    <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
                    <td class="text-right py-2 text-zinc-300">{formatCost(stats.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Log Tailer */}
      <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 no-scanline relative z-[10001]">
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

            function addLogEntry(log) {
              const row = document.createElement('tr');
              row.className = 'border-b last:border-0 border-zinc-800 animate-fade-in';
              const time = new Date(log.timestamp).toLocaleTimeString();
              const cells = [
                { text: time, cls: 'py-2 font-mono text-xs text-zinc-300' },
                { text: String(log.action), cls: 'py-2 capitalize text-zinc-300' },
                { text: log.meta ?? '', cls: 'py-2 text-zinc-400 text-xs' },
                { text: String(log.model), cls: 'py-2 font-mono text-xs text-zinc-300' },
                { text: String(log.inputTokens) + '+' + String(log.outputTokens), cls: 'text-right py-2 text-zinc-300' },
                { text: formatCost(log.estimatedCostUsd), cls: 'text-right py-2 text-zinc-300' },
                { text: String(log.durationMs) + 'ms', cls: 'text-right py-2 text-zinc-300' },
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
    </div>
  )
}
