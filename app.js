const STORAGE_KEY = 'second-brain-graph-v1';

const detailCard = document.getElementById('detail-card');
const emptyState = document.getElementById('empty-state');
const detailTitle = document.getElementById('detail-title');
const detailDescription = document.getElementById('detail-description');
const detailTags = document.getElementById('detail-tags');
const detailRelations = document.getElementById('detail-relations');
const searchInput = document.getElementById('search');
const ideaInput = document.getElementById('idea-input');
const ideaTagsInput = document.getElementById('idea-tags');
const addIdeaBtn = document.getElementById('add-idea-btn');
const resetBtn = document.getElementById('reset-btn');

const response = await fetch('./graph-data.json');
const starterData = await response.json();
const graphData = loadData(starterData);

const cy = cytoscape({
  container: document.getElementById('graph'),
  elements: toElements(graphData),
  style: [
    {
      selector: 'node',
      style: {
        'background-color': '#58a6ff',
        label: 'data(label)',
        color: '#e6edf3',
        'font-size': '10px',
        'text-wrap': 'wrap',
        'text-max-width': '90px',
        'text-valign': 'bottom',
        'text-margin-y': '8px',
        width: '28px',
        height: '28px',
      },
    },
    {
      selector: 'node[type = "expansion"]',
      style: {
        'background-color': '#6dd17c',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#30363d',
        'target-arrow-color': '#30363d',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(relationship)',
        color: '#8b949e',
        'font-size': '8px',
      },
    },
    {
      selector: '.faded',
      style: {
        opacity: 0.15,
      },
    },
    {
      selector: '.highlighted',
      style: {
        opacity: 1,
      },
    },
  ],
  layout: {
    name: 'cose',
    animate: false,
    idealEdgeLength: 120,
    nodeRepulsion: 4500,
  },
});

function toElements(data) {
  return [
    ...data.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        description: node.description,
        tags: node.tags,
        type: node.type || 'core',
      },
    })),
    ...data.edges.map((edge, index) => ({
      data: {
        id: edge.id || `edge-${index}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        relationship: edge.relationship,
      },
    })),
  ];
}

function loadData(fallbackData) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(fallbackData);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
    };
  } catch {
    return structuredClone(fallbackData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graphData));
}

function clearList(listEl) {
  listEl.innerHTML = '';
}

function fillList(listEl, values) {
  clearList(listEl);
  values.forEach((value) => {
    const li = document.createElement('li');
    li.textContent = value;
    listEl.appendChild(li);
  });
}

function showNodeDetails(node) {
  const neighbors = node
    .connectedEdges()
    .map((edge) => {
      const source = edge.source().data('label');
      const target = edge.target().data('label');
      const relation = edge.data('relationship');
      return `${source} —${relation}→ ${target}`;
    })
    .toArray();

  detailTitle.textContent = node.data('label');
  detailDescription.textContent = node.data('description');
  fillList(detailTags, node.data('tags') || ['no tags']);
  fillList(detailRelations, neighbors.length ? neighbors : ['no linked ideas yet']);

  emptyState.hidden = true;
  detailCard.hidden = false;
}

function highlightNeighborhood(node) {
  cy.elements().addClass('faded').removeClass('highlighted');
  node.removeClass('faded').addClass('highlighted');
  node.neighborhood().removeClass('faded').addClass('highlighted');
}

function resetHighlight() {
  cy.elements().removeClass('faded highlighted');
}

function relayout() {
  cy.layout({
    name: 'cose',
    animate: true,
    animationDuration: 250,
    idealEdgeLength: 120,
    nodeRepulsion: 4500,
  }).run();
}

function normalizeText(input) {
  return input.trim().replace(/\s+/g, ' ');
}

function makeId(prefix = 'idea') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function splitIntoKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .slice(0, 8);
}

function generateExpansions(baseNode, tags) {
  const keywords = splitIntoKeywords(baseNode.description);
  const focus = keywords[0] || 'idea';

  const expansions = [
    {
      label: `Next action: ${focus}`,
      description: `Concrete next step to move "${baseNode.label}" forward.`,
      relationship: 'action-for',
      tags: [...tags, 'action'],
    },
    {
      label: `Question: ${focus}`,
      description: `Open question that should be explored to clarify "${baseNode.label}".`,
      relationship: 'question-for',
      tags: [...tags, 'question'],
    },
    {
      label: `Resource: ${focus}`,
      description: `A person, article, or tool that could strengthen "${baseNode.label}".`,
      relationship: 'resource-for',
      tags: [...tags, 'resource'],
    },
  ];

  return expansions;
}

function addNode(node) {
  graphData.nodes.push(node);
  cy.add({ data: node });
}

function addEdge(edge) {
  graphData.edges.push(edge);
  cy.add({ data: edge });
}

function linkToRelatedNodes(newNode) {
  const newTags = new Set((newNode.tags || []).map((t) => t.toLowerCase()));

  graphData.nodes.forEach((candidate) => {
    if (candidate.id === newNode.id) {
      return;
    }

    const overlap = (candidate.tags || []).some((tag) => newTags.has(tag.toLowerCase()));
    if (!overlap) {
      return;
    }

    const edge = {
      id: makeId('edge'),
      source: newNode.id,
      target: candidate.id,
      relationship: 'related-to',
    };

    const alreadyExists = graphData.edges.some(
      (existing) => existing.source === edge.source && existing.target === edge.target,
    );

    if (!alreadyExists) {
      addEdge(edge);
    }
  });
}

function handleAddIdea() {
  const text = normalizeText(ideaInput.value);
  if (!text) {
    return;
  }

  const title = text.slice(0, 64);
  const tags = ideaTagsInput.value
    .split(',')
    .map((tag) => normalizeText(tag).toLowerCase())
    .filter(Boolean);

  const baseNode = {
    id: makeId('idea'),
    label: title,
    description: text,
    tags: tags.length ? tags : ['inbox'],
    type: 'idea',
  };

  addNode(baseNode);

  const expansions = generateExpansions(baseNode, baseNode.tags);
  expansions.forEach((expansion) => {
    const expansionNode = {
      id: makeId('exp'),
      label: expansion.label,
      description: expansion.description,
      tags: expansion.tags,
      type: 'expansion',
    };

    addNode(expansionNode);
    addEdge({
      id: makeId('edge'),
      source: baseNode.id,
      target: expansionNode.id,
      relationship: expansion.relationship,
    });
  });

  linkToRelatedNodes(baseNode);
  saveData();
  relayout();
  showNodeDetails(cy.getElementById(baseNode.id));

  ideaInput.value = '';
  ideaTagsInput.value = '';
}

function resetGraph() {
  graphData.nodes = structuredClone(starterData.nodes);
  graphData.edges = structuredClone(starterData.edges);

  cy.elements().remove();
  cy.add(toElements(graphData));
  saveData();
  relayout();

  detailCard.hidden = true;
  emptyState.hidden = false;
}

cy.on('mouseover', 'node', (event) => {
  highlightNeighborhood(event.target);
});

cy.on('mouseout', 'node', () => {
  resetHighlight();
});

cy.on('tap', 'node', (event) => {
  const node = event.target;
  showNodeDetails(node);
  highlightNeighborhood(node);
});

searchInput.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  cy.nodes().forEach((node) => {
    const label = node.data('label').toLowerCase();
    const description = node.data('description').toLowerCase();
    const tags = (node.data('tags') || []).join(' ').toLowerCase();
    const match = !query || label.includes(query) || description.includes(query) || tags.includes(query);
    node.style('display', match ? 'element' : 'none');
  });

  cy.edges().forEach((edge) => {
    const sourceVisible = edge.source().style('display') === 'element';
    const targetVisible = edge.target().style('display') === 'element';
    edge.style('display', sourceVisible && targetVisible ? 'element' : 'none');
  });
});

addIdeaBtn.addEventListener('click', handleAddIdea);
resetBtn.addEventListener('click', resetGraph);

ideaInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    handleAddIdea();
  }
});
