// Handler for dumping and loading board data

// Dump current board to JSON
async function dumpBoard() {
  const { log, sendToUI } = globalThis.figmaUtils;
  try {
    const boardData = {
      name: figma.currentPage.name,
      nodes: []
    };

    const allNodes = figma.currentPage.findAll();

    for (const node of allNodes) {
      const nodeData = {
        id: node.id,
        type: node.type,
        name: node.name
      };

      // Add position if available
      if (node.x !== undefined && node.y !== undefined) {
        nodeData.position = {
          x: node.x,
          y: node.y
        };
      }

      // Add size if available
      if (node.width !== undefined && node.height !== undefined) {
        nodeData.size = {
          width: node.width,
          height: node.height
        };
      }

      // Add text content and styling for text-based nodes
      if (node.type === "TEXT") {
        try {
          nodeData.text = node.characters;
          // Save font information
          if (node.fontName !== figma.mixed) {
            nodeData.font = {
              family: node.fontName.family,
              style: node.fontName.style
            };
          }
          // Save text styling
          if (node.fontSize !== figma.mixed) {
            nodeData.fontSize = node.fontSize;
          }
          if (node.fills !== figma.mixed && node.fills.length > 0) {
            nodeData.fills = JSON.parse(JSON.stringify(node.fills));
          }
        } catch (e) {
          console.error(`Error reading TEXT node: ${e.message}`);
          nodeData.text = "";
        }
      }

      // Handle STICKY nodes
      if (node.type === "STICKY") {
        try {
          nodeData.text = node.text.characters;
          // Save sticky color
          if (node.fills !== figma.mixed && node.fills.length > 0) {
            nodeData.fills = JSON.parse(JSON.stringify(node.fills));
          }
        } catch (e) {
          console.error(`Error reading STICKY node: ${e.message}`);
          nodeData.text = "";
        }
      }

      // Handle SHAPE_WITH_TEXT nodes
      if (node.type === "SHAPE_WITH_TEXT") {
        try {
          nodeData.text = node.text.characters;
          nodeData.shapeType = node.shapeType;
          // Save fills and strokes
          if (node.fills !== figma.mixed && node.fills.length > 0) {
            nodeData.fills = JSON.parse(JSON.stringify(node.fills));
          }
          if (node.strokes !== figma.mixed && node.strokes.length > 0) {
            nodeData.strokes = JSON.parse(JSON.stringify(node.strokes));
          }
        } catch (e) {
          console.error(`Error reading SHAPE_WITH_TEXT node: ${e.message}`);
          nodeData.text = "";
        }
      }

      // Save fills for shape nodes
      if (node.type === "RECTANGLE" || node.type === "ELLIPSE" || node.type === "FRAME") {
        try {
          if (node.fills !== figma.mixed && node.fills.length > 0) {
            nodeData.fills = JSON.parse(JSON.stringify(node.fills));
          }
          if (node.strokes !== figma.mixed && node.strokes.length > 0) {
            nodeData.strokes = JSON.parse(JSON.stringify(node.strokes));
            nodeData.strokeWeight = node.strokeWeight;
          }
          if (node.cornerRadius !== undefined) {
            nodeData.cornerRadius = node.cornerRadius;
          }
        } catch (e) {
          console.error(`Error reading shape properties: ${e.message}`);
        }
      }

      boardData.nodes.push(nodeData);
    }

    sendToUI('board-dump', { data: boardData });
    log('Board exported successfully');
  } catch (e) {
    log(`Error dumping board: ${e.message}`);
  }
}

// Load board from JSON
async function loadBoard(data) {
  const { log, sendToUI } = globalThis.figmaUtils;

  try {
    const boardData = data.boardData;
    
    if (!boardData || !boardData.nodes) {
      log('Invalid board data format');
      return;
    }

    log(`Loading ${boardData.nodes.length} nodes...`);

    // Clear existing nodes if requested
    if (data.clearExisting) {
      const existingNodes = figma.currentPage.findAll();
      existingNodes.forEach(node => {
        try {
          node.remove();
        } catch (e) {
          // Some nodes might not be removable
        }
      });
      log('Cleared existing nodes');
    }

    let successCount = 0;
    let errorCount = 0;

    // Create nodes from data
    for (const nodeData of boardData.nodes) {
      try {
        await createNodeFromData(nodeData);
        successCount++;
      } catch (e) {
        console.error(`Error creating node ${nodeData.name}:`, e);
        errorCount++;
      }
    }

    log(`Board loaded: ${successCount} nodes created${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
    sendToUI('status', {
      message: `Board loaded: ${successCount} nodes created`,
      status: 'active'
    });
  } catch (e) {
    log(`Error loading board: ${e.message}`);
  }
}

// Create a node from data
async function createNodeFromData(nodeData) {
  let node = null;

  switch (nodeData.type) {
    case 'STICKY':
      node = figma.createSticky();
      if (nodeData.text) {
        try {
          node.text.characters = nodeData.text;
        } catch (e) {
          console.error(`Error setting STICKY text: ${e.message}`);
        }
      }
      // Restore fills (color)
      if (nodeData.fills) {
        try {
          node.fills = nodeData.fills;
        } catch (e) {
          console.error(`Error setting STICKY fills: ${e.message}`);
        }
      }
      break;

    case 'TEXT':
      node = figma.createText();
      // Load font before setting text
      const font = nodeData.font || { family: "Inter", style: "Regular" };
      try {
        await figma.loadFontAsync(font);
        node.fontName = font;
      } catch (e) {
        // Fallback to default font
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        console.warn(`Could not load font ${font.family}, using default`);
      }
      
      if (nodeData.text) {
        node.characters = nodeData.text;
      }
      
      // Restore text styling
      if (nodeData.fontSize) {
        node.fontSize = nodeData.fontSize;
      }
      if (nodeData.fills) {
        try {
          node.fills = nodeData.fills;
        } catch (e) {
          console.error(`Error setting TEXT fills: ${e.message}`);
        }
      }
      break;

    case 'RECTANGLE':
      node = figma.createRectangle();
      if (nodeData.cornerRadius !== undefined) {
        node.cornerRadius = nodeData.cornerRadius;
      }
      break;

    case 'ELLIPSE':
      node = figma.createEllipse();
      break;

    case 'FRAME':
      node = figma.createFrame();
      break;

    case 'SHAPE_WITH_TEXT':
      node = figma.createShapeWithText();
      if (nodeData.text) {
        try {
          // Load default font for shape text
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          node.text.characters = nodeData.text;
        } catch (e) {
          console.error(`Error setting SHAPE_WITH_TEXT text: ${e.message}`);
        }
      }
      if (nodeData.shapeType) {
        node.shapeType = nodeData.shapeType;
      }
      break;

    default:
      console.log(`Unsupported node type: ${nodeData.type}`);
      return;
  }

  if (!node) return;

  // Set name
  if (nodeData.name) {
    node.name = nodeData.name;
  }

  // Set position
  if (nodeData.position) {
    node.x = nodeData.position.x;
    node.y = nodeData.position.y;
  }

  // Set size
  if (nodeData.size) {
    try {
      node.resize(nodeData.size.width, nodeData.size.height);
    } catch (e) {
      console.error(`Error resizing node: ${e.message}`);
    }
  }

  // Restore fills for shape nodes
  if (nodeData.fills && (nodeData.type === 'RECTANGLE' || nodeData.type === 'ELLIPSE' || 
      nodeData.type === 'FRAME' || nodeData.type === 'SHAPE_WITH_TEXT')) {
    try {
      node.fills = nodeData.fills;
    } catch (e) {
      console.error(`Error setting fills: ${e.message}`);
    }
  }

  // Restore strokes
  if (nodeData.strokes) {
    try {
      node.strokes = nodeData.strokes;
      if (nodeData.strokeWeight !== undefined) {
        node.strokeWeight = nodeData.strokeWeight;
      }
    } catch (e) {
      console.error(`Error setting strokes: ${e.message}`);
    }
  }
}

// Main handler function
async function handle(data) {
  if (data.action === 'dump') {
    await dumpBoard();
  } else if (data.action === 'load') {
    await loadBoard(data);
  }
}

module.exports = {
  handle,
  dumpBoard,
  loadBoard
};