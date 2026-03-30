import { LiteGraph } from 'litegraph.js';

const DYNO_TYPES = ['dyno_float', 'dyno_vec2', 'dyno_vec3', 'dyno_vec4', 'dyno_int', 'splat_source'];

// ── Subgraph Input ──────────────────────────────────────────────────────────
// Placed inside a subgraph to expose an external input port.
// Reads from this.graph.inputs[name].value (set by parent Subgraph.onExecute).

function DynoSubInput() {
  this.addOutput('value', 'dyno_float');
  this.name_in_graph = '';
  this.properties = { name: '', type: 'dyno_float' };
  this.size = [180, 65];

  this.name_widget = this.addWidget('text', 'Name', '', (v) => this.setProperty('name', v));
  this.type_widget = this.addWidget('combo', 'Type', 'dyno_float', (v) => this.setProperty('type', v),
    { values: DYNO_TYPES });

  this.widgets_up = true;
}

DynoSubInput.title = 'Input';
DynoSubInput.desc  = 'Subgraph input (dyno)';

DynoSubInput.prototype.onPropertyChanged = function (name, v) {
  if (name === 'name') {
    if (!v || v === this.name_in_graph) return false;
    if (this.graph) {
      this.name_in_graph
        ? this.graph.renameInput(this.name_in_graph, v)
        : this.graph.addInput(v, this.properties.type);
    }
    this.name_widget.value = v;
    this.name_in_graph = v;
  } else if (name === 'type') {
    this.outputs[0].type = v;
    if (this.graph && this.name_in_graph) this.graph.changeInputType(this.name_in_graph, v);
    this.type_widget.value = v;
  }
};

DynoSubInput.prototype.onConfigure = function () {
  this.outputs[0].type = this.properties.type;
  this.name_in_graph   = this.properties.name;
};

DynoSubInput.prototype.onExecute = function () {
  const data = this.graph.inputs?.[this.properties.name];
  this.setOutputData(0, data?.value ?? null);
};

DynoSubInput.prototype.onRemoved = function () {
  if (this.name_in_graph) this.graph.removeInput(this.name_in_graph);
};

DynoSubInput.prototype.getTitle = function () {
  return this.flags.collapsed ? this.properties.name : this.title;
};

LiteGraph.registerNodeType('3dgs/subgraph/Input', DynoSubInput);


// ── Subgraph Output ─────────────────────────────────────────────────────────
// Placed inside a subgraph to expose an external output port.
// Writes to this.graph.setOutputData so the parent Subgraph.onExecute can read it.

function DynoSubOutput() {
  this.addInput('value', 'dyno_float');
  this.name_in_graph = '';
  this.properties = { name: '', type: 'dyno_float' };
  this.size = [180, 65];

  this.name_widget = this.addWidget('text', 'Name', '', (v) => this.setProperty('name', v));
  this.type_widget = this.addWidget('combo', 'Type', 'dyno_float', (v) => this.setProperty('type', v),
    { values: DYNO_TYPES });

  this.widgets_up = true;
}

DynoSubOutput.title = 'Output';
DynoSubOutput.desc  = 'Subgraph output (dyno)';

DynoSubOutput.prototype.onPropertyChanged = function (name, v) {
  if (name === 'name') {
    if (!v || v === this.name_in_graph) return false;
    if (this.graph) {
      this.name_in_graph
        ? this.graph.renameOutput(this.name_in_graph, v)
        : this.graph.addOutput(v, this.properties.type);
    }
    this.name_widget.value = v;
    this.name_in_graph = v;
  } else if (name === 'type') {
    this.inputs[0].type = v;
    if (this.graph && this.name_in_graph) this.graph.changeOutputType(this.name_in_graph, v);
    this.type_widget.value = v;
  }
};

DynoSubOutput.prototype.onConfigure = function () {
  this.inputs[0].type = this.properties.type;
  this.name_in_graph  = this.properties.name;
};

DynoSubOutput.prototype.onExecute = function () {
  this.graph.setOutputData(this.properties.name, this.getInputData(0));
};

DynoSubOutput.prototype.onRemoved = function () {
  if (this.name_in_graph) this.graph.removeOutput(this.name_in_graph);
};

DynoSubOutput.prototype.getTitle = function () {
  return this.flags.collapsed ? this.properties.name : this.title;
};

LiteGraph.registerNodeType('3dgs/subgraph/Output', DynoSubOutput);


// ── Dyno Subgraph ───────────────────────────────────────────────────────────
// Inherits all built-in subgraph behavior (double-click to open, +/- ports,
// onExecute value threading) and overrides the input/output node types.

export function registerSubgraphNode() {
  const BuiltinSubgraph = LiteGraph.registered_node_types['graph/subgraph'];
  if (!BuiltinSubgraph) {
    console.warn('graph/subgraph not found — DynoSubgraph skipped');
    return;
  }

  function DynoSubgraph() {
    BuiltinSubgraph.call(this);
  }

  DynoSubgraph.prototype             = Object.create(BuiltinSubgraph.prototype);
  DynoSubgraph.prototype.constructor = DynoSubgraph;

  // Fix: subgraph.configure() → clear() removes internal Input/Output nodes,
  // triggering onSubgraphRemovedInput/Output which calls removeInput/removeOutput
  // on the outer node, destroying external ports AND deleting links from graph.links.
  // Solution: mute the remove callbacks during configure so ports survive.
  const origConfigure = DynoSubgraph.prototype.configure || LiteGraph.LGraphNode.prototype.configure;
  DynoSubgraph.prototype.configure = function (info) {
    // Mute remove callbacks — subgraph.clear() will fire these but we don't want them
    const origRemovedIn  = this.subgraph.onInputRemoved;
    const origRemovedOut = this.subgraph.onOutputRemoved;
    // Also mute add callbacks — subgraph rebuild will re-add Input/Output nodes
    // which would duplicate ports that are already restored from saved data
    const origAddedIn  = this.subgraph.onInputAdded;
    const origAddedOut = this.subgraph.onOutputAdded;

    this.subgraph.onInputRemoved  = null;
    this.subgraph.onOutputRemoved = null;
    this.subgraph.onInputAdded    = null;
    this.subgraph.onOutputAdded   = null;

    origConfigure.call(this, info);

    // Restore callbacks
    this.subgraph.onInputRemoved  = origRemovedIn;
    this.subgraph.onOutputRemoved = origRemovedOut;
    this.subgraph.onInputAdded    = origAddedIn;
    this.subgraph.onOutputAdded   = origAddedOut;
  };

  DynoSubgraph.title            = 'Subgraph';
  DynoSubgraph.desc             = 'Reusable node group (dyno-aware)';
  DynoSubgraph.title_color      = '#334';
  DynoSubgraph.input_node_type  = '3dgs/subgraph/Input';
  DynoSubgraph.output_node_type = '3dgs/subgraph/Output';

  LiteGraph.registerNodeType('3dgs/Subgraph', DynoSubgraph);
}
