const $ = (id)=>document.getElementById(id);
const state = {
  nodes: {},
  edges: [],
  selectedId: null,
  rootId: null
};

const storageKey = "garden_mvp_state_v1";

function saveState(){
  localStorage.setItem(storageKey, JSON.stringify(state));
}
function loadState(){
  const raw = localStorage.getItem(storageKey);
  if(!raw) return;
  const data = JSON.parse(raw);
  Object.assign(state, data);
}

function uid(){
  return "n_"+Math.random().toString(36).slice(2,10);
}

function createNode({title, def, points, example}){
  const id = uid();
  state.nodes[id] = {id, title, def, points, example};
  return id;
}

function connect(a,b){
  state.edges.push({from:a, to:b});
}

function clearSelection(){
  state.selectedId = null;
  $("nodeDetail").classList.add("hidden");
  $("nodeEmpty").classList.remove("hidden");
}

function selectNode(id){
  state.selectedId = id;
  const n = state.nodes[id];
  if(!n) return;
  $("nodeTitle").value = n.title || "";
  $("nodeDef").value = n.def || "";
  $("nodePoints").value = n.points || "";
  $("nodeExample").value = n.example || "";
  $("nodeDetail").classList.remove("hidden");
  $("nodeEmpty").classList.add("hidden");
  renderMap();
}

function deleteNode(id){
  delete state.nodes[id];
  state.edges = state.edges.filter(e=>e.from!==id && e.to!==id);
  if(state.rootId===id) state.rootId = null;
  clearSelection();
  saveState();
  renderMap();
}

function buildPositions(){
  const ids = Object.keys(state.nodes);
  if(ids.length===0) return {};
  const root = state.rootId || ids[0];
  const positions = {};
  const center = {x: 0.5, y: 0.5};
  positions[root] = center;

  const others = ids.filter(id=>id!==root);
  const radius = 0.35;
  others.forEach((id, idx)=>{
    const angle = (idx/Math.max(1, others.length)) * Math.PI*2;
    positions[id] = {
      x: center.x + radius*Math.cos(angle),
      y: center.y + radius*Math.sin(angle)
    };
  });
  return positions;
}

function renderMap(){
  const canvas = $("mapCanvas");
  canvas.innerHTML = "";
  const rect = canvas.getBoundingClientRect();
  const positions = buildPositions();

  // edges
  state.edges.forEach(edge=>{
    const a = positions[edge.from];
    const b = positions[edge.to];
    if(!a || !b) return;
    const x1 = a.x * rect.width;
    const y1 = a.y * rect.height;
    const x2 = b.x * rect.width;
    const y2 = b.y * rect.height;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * 180/Math.PI;

    const edgeEl = document.createElement("div");
    edgeEl.className = "edge";
    edgeEl.style.left = `${x1}px`;
    edgeEl.style.top = `${y1}px`;
    edgeEl.style.width = `${len}px`;
    edgeEl.style.transform = `rotate(${angle}deg)`;
    canvas.appendChild(edgeEl);
  });

  // nodes
  Object.values(state.nodes).forEach(n=>{
    const pos = positions[n.id] || {x:0.5,y:0.5};
    const nodeEl = document.createElement("div");
    nodeEl.className = "node" + (state.selectedId===n.id ? " selected" : "");
    nodeEl.style.left = `${pos.x*rect.width - 60}px`;
    nodeEl.style.top = `${pos.y*rect.height - 30}px`;
    nodeEl.innerHTML = `<h4>${n.title || "(untitled)"}</h4><p>${(n.def||"").slice(0,70)}</p>`;
    nodeEl.onclick = ()=>selectNode(n.id);
    canvas.appendChild(nodeEl);
  });
}

function init(){
  loadState();
  if(Object.keys(state.nodes).length){
    renderMap();
  }

  $("createSeedBtn").onclick = ()=>{
    const title = $("seedTitle").value.trim();
    if(!title) return alert("Add a topic or question.");
    const id = createNode({
      title,
      def: $("seedDef").value.trim(),
      points: $("seedPoints").value.trim(),
      example: $("seedExample").value.trim()
    });
    state.rootId = id;
    saveState();
    renderMap();
    selectNode(id);
  };

  $("saveNodeBtn").onclick = ()=>{
    const id = state.selectedId; if(!id) return;
    const n = state.nodes[id]; if(!n) return;
    n.title = $("nodeTitle").value.trim();
    n.def = $("nodeDef").value.trim();
    n.points = $("nodePoints").value.trim();
    n.example = $("nodeExample").value.trim();
    saveState();
    renderMap();
  };

  $("deleteNodeBtn").onclick = ()=>{
    const id = state.selectedId; if(!id) return;
    if(confirm("Delete this node?")) deleteNode(id);
  };

  $("addRelatedBtn").onclick = ()=>{
    $("modal").classList.remove("hidden");
  };
  $("cancelRelBtn").onclick = ()=>{
    $("modal").classList.add("hidden");
  };
  $("createRelBtn").onclick = ()=>{
    const title = $("relTitle").value.trim();
    if(!title) return alert("Add a title.");
    const id = createNode({
      title,
      def: $("relDef").value.trim(),
      points: $("relPoints").value.trim(),
      example: $("relExample").value.trim()
    });
    if(state.selectedId) connect(state.selectedId, id);
    saveState();
    $("modal").classList.add("hidden");
    $("relTitle").value = $("relDef").value = $("relPoints").value = $("relExample").value = "";
    renderMap();
  };

  $("newMapBtn").onclick = ()=>{
    if(confirm("Start a new map? This clears local data.")){
      localStorage.removeItem(storageKey);
      state.nodes = {}; state.edges = []; state.selectedId = null; state.rootId = null;
      renderMap();
      clearSelection();
    }
  };

  $("exportBtn").onclick = ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "garden_mvp_map.json";
    a.click();
  };

  $("centerBtn").onclick = ()=>renderMap();
}

window.addEventListener("resize", renderMap);
init();
