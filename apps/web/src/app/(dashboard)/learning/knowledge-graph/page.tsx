'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, RefreshCw, Loader2, Brain, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getKGViz, type KGVizData } from '@/services/gamification';

const SUBJECTS = [
  { key: 'general',  label: 'Tổng hợp' },
  { key: 'math',     label: 'Toán học' },
  { key: 'viet',     label: 'Tiếng Việt' },
  { key: 'language', label: 'Ngoại ngữ' },
];

const NODE_COLORS: Record<number, string> = {
  0: '#6366f1', // root — indigo
  1: '#0ea5e9', // depth 1 — sky
  2: '#10b981', // depth 2 — emerald
  3: '#f59e0b', // depth 3 — amber
};

function depthColor(depth: number): string {
  return NODE_COLORS[Math.min(depth, 3)] ?? '#94a3b8';
}

function buildFlowData(data: KGVizData): { nodes: Node[]; edges: Edge[] } {
  const COLS = 4;
  const H_GAP = 220;
  const V_GAP = 120;

  const byDepth: Record<number, string[]> = {};
  for (const n of data.nodes) {
    const d = n.depth ?? 0;
    (byDepth[d] = byDepth[d] ?? []).push(n.id);
  }

  const pos: Record<string, { x: number; y: number }> = {};
  for (const [d, ids] of Object.entries(byDepth)) {
    const depth = Number(d);
    ids.forEach((id, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      pos[id] = { x: col * H_GAP - ((Math.min(ids.length, COLS) - 1) * H_GAP) / 2, y: depth * V_GAP + row * (V_GAP / 2) };
    });
  }

  const nodes: Node[] = data.nodes.map(n => ({
    id: n.id,
    position: pos[n.id] ?? { x: 0, y: 0 },
    data: { label: n.label, weight: n.weight, depth: n.depth ?? 0 },
    style: {
      background: depthColor(n.depth ?? 0),
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      padding: '8px 14px',
      fontSize: 12,
      fontWeight: 600,
      minWidth: 80,
      maxWidth: 160,
      textAlign: 'center' as const,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      opacity: 0.8 + Math.min(n.weight, 5) * 0.04,
    },
  }));

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const e of data.edges) {
    const eid = `${e.from}-${e.to}-${e.type}`;
    if (seen.has(eid)) continue;
    seen.add(eid);
    edges.push({
      id: eid,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      animated: e.type === 'child',
      style: {
        stroke: e.type === 'child' ? '#6366f1' : e.type === 'related' ? '#94a3b8' : '#ef4444',
        strokeWidth: e.type === 'child' ? 2 : 1,
        strokeDasharray: e.type === 'related' ? '4 3' : undefined,
      },
    });
  }

  return { nodes, edges };
}

type DepthLimit = 'all' | 1 | 2;
type EdgeFilter = 'all' | 'child';

export default function KnowledgeGraphPage() {
  const [subject, setSubject] = useState('general');
  const [kgData, setKgData] = useState<KGVizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ label: string; weight: number; depth: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [depthLimit, setDepthLimit] = useState<DepthLimit>('all');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>('all');

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const onConnect = useCallback((c: Connection) => setRfEdges(eds => addEdge(c, eds)), [setRfEdges]);

  const load = async (sub: string) => {
    setLoading(true);
    setSelected(null);
    setSearchText('');
    try {
      const data = await getKGViz(sub);
      setKgData(data);
    } finally {
      setLoading(false);
    }
  };

  // Derived filtered data
  const filteredData = useMemo(() => {
    if (!kgData) return null;
    let nodes = kgData.nodes;

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      nodes = nodes.filter(n => n.label.toLowerCase().includes(q));
    }
    if (depthLimit !== 'all') {
      nodes = nodes.filter(n => (n.depth ?? 0) <= depthLimit);
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    let edges = kgData.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    if (edgeFilter === 'child') {
      edges = edges.filter(e => e.type === 'child');
    }

    return { nodes, edges, rootIds: kgData.rootIds, subject: kgData.subject, builtAt: kgData.builtAt };
  }, [kgData, searchText, depthLimit, edgeFilter]);

  useEffect(() => {
    if (!filteredData || filteredData.nodes.length === 0) {
      setRfNodes([]); setRfEdges([]); return;
    }
    const { nodes, edges } = buildFlowData(filteredData);
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [filteredData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(subject); }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = !kgData || kgData.nodes.length === 0;
  const filteredEmpty = !filteredData || filteredData.nodes.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Knowledge Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Biểu đồ kiến thức được AI xây dựng từ lịch sử học tập
          </p>
        </div>
        <button
          onClick={() => load(subject)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Cập nhật
        </button>
      </div>

      {/* Subject selector */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSubject(s.key)}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
              subject === s.key
                ? 'bg-primary text-white border-primary'
                : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search + Filter bar */}
      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm khái niệm..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Depth filter */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {(['all', 1, 2] as DepthLimit[]).map(d => (
              <button key={String(d)} onClick={() => setDepthLimit(d)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg border transition-all',
                  depthLimit === d ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
                )}>
                {d === 'all' ? 'Tất cả' : `≤ Cấp ${d}`}
              </button>
            ))}
          </div>

          {/* Edge type filter */}
          <div className="flex items-center gap-1.5">
            {(['all', 'child'] as EdgeFilter[]).map(e => (
              <button key={e} onClick={() => setEdgeFilter(e)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg border transition-all',
                  edgeFilter === e ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
                )}>
                {e === 'all' ? 'Mọi liên kết' : 'Chỉ cấu trúc'}
              </button>
            ))}
          </div>

          {/* Filter result count */}
          {(searchText || depthLimit !== 'all' || edgeFilter !== 'all') && filteredData && (
            <span className="text-xs text-muted-foreground">
              {filteredData.nodes.length}/{kgData?.nodes.length ?? 0} khái niệm
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {[
          { color: '#6366f1', label: 'Khái niệm gốc' },
          { color: '#0ea5e9', label: 'Cấp 1' },
          { color: '#10b981', label: 'Cấp 2' },
          { color: '#f59e0b', label: 'Cấp 3+' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-px w-6 bg-primary" />Quan hệ cha–con
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-6 bg-gray-400 border-dashed border-t border-gray-400" style={{ borderStyle: 'dashed' }} />Liên quan
        </span>
      </div>

      {/* Graph area */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ height: 520 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải biểu đồ...
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Brain className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-600">Chưa có dữ liệu Knowledge Graph</p>
            <p className="text-xs text-muted-foreground mt-1">
              Hãy chat với AI Tutor về chủ đề bạn đang học. AI sẽ tự động xây dựng biểu đồ kiến thức sau mỗi cuộc trò chuyện.
            </p>
          </div>
        ) : filteredEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Search className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-600">Không tìm thấy khái niệm nào</p>
            <p className="text-xs text-muted-foreground mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setSelected(node.data as any)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="#f1f5f9" gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={n => depthColor(n.data?.depth ?? 0)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Node detail panel */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: depthColor(selected.depth) }}>
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{selected.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cấp độ: {selected.depth} · Trọng số: {selected.weight}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {kgData && !isEmpty && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xl font-bold text-primary">{kgData.nodes.length}</p>
            <p className="text-xs text-muted-foreground">Khái niệm</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xl font-bold text-indigo-600">{kgData.edges.length}</p>
            <p className="text-xs text-muted-foreground">Liên kết</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xl font-bold text-emerald-600">{kgData.rootIds.length}</p>
            <p className="text-xs text-muted-foreground">Khái niệm gốc</p>
          </div>
        </div>
      )}
    </div>
  );
}
