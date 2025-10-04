const handlerRegistry = require('./handlers/handlerRegistry');

const stickerHandler = require('./handlers/stickerHandler');
const stickerColumnHandler = require('./handlers/stickerColumnHandler');
const imagesHandler = require('./handlers/imagesHandler'); 
const tableHandler = require('./handlers/tablesHandler');
const sectionHandler = require('./handlers/sectionHandler');
const titleHandler = require('./handlers/titleHandler');
const boardDumper = require('./handlers/boardDumper');

// Register handlers
handlerRegistry.register('addSticker', stickerHandler.handle);
handlerRegistry.register('addStickerColumn', stickerColumnHandler.handle);
handlerRegistry.register('addImages', imagesHandler.handle);
handlerRegistry.register('addTable', tableHandler.handle);
handlerRegistry.register('addSection', sectionHandler.handle);
handlerRegistry.register('addTitle', titleHandler.handle);
handlerRegistry.register('boardDump', boardDumper.handle);

figma.showUI(__html__, { width: 420, height: 450 });

// Utility: Send message to UI
function sendToUI(type, data) {
  figma.ui.postMessage({
    type,
    ...data
  });
}

// Utility: Log and notify
function log(message) {
  console.log(message);
  figma.notify(message);
  sendToUI('log', {
    message
  });
}

// Find a node by title (used by handlers)
function findNodeByTitle(title) {
  try {
    // Search for sticky notes
    const nodes = figma.currentPage.findAll(node => {
      try {
        return (
          (node.type === "STICKY" || node.type === "SHAPE_WITH_TEXT") &&
          node.name.toLowerCase().includes(title.toLowerCase())
        );
      } catch (e) {
        return false;
      }
    });

    if (nodes.length > 0) {
      return nodes[0];
    }

    // Search for text nodes
    const textNodes = figma.currentPage.findAll(node => {
      try {
        return (
          node.type === "TEXT" &&
          node.characters.toLowerCase().includes(title.toLowerCase())
        );
      } catch (e) {
        return false;
      }
    });

    if (textNodes.length > 0) {
      return textNodes[0];
    }

    return null;
  } catch (e) {
    log(`Error finding node: ${e.message}`);
    return null;
  }
}

// Export utilities for handlers (use globalThis instead of global)
globalThis.figmaUtils = {
  log,
  sendToUI,
  findNodeByTitle
};

// Dump current board to JSON
async function dumpBoard() {
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

      // Add text content for text-based nodes
      if (node.type === "TEXT" || node.type === "STICKY") {
        try {
          nodeData.text = node.characters || node.text?.characters || "";
        } catch (e) {
          nodeData.text = "";
        }
      }

      boardData.nodes.push(nodeData);
    }

    sendToUI('board-dump', {
      data: boardData
    });
    log('Board exported successfully');
  } catch (e) {
    log(`Error dumping board: ${e.message}`);
  }
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'process-request') {
      // Route to appropriate handler
      const requestType = msg.data.type;
      const handler = handlerRegistry.get(requestType);

      if (handler) {
        log(`Processing ${requestType} request...`);
        await handler(msg.data);
        sendToUI('status', {
          message: `${requestType} completed`,
          status: 'active'
        });
      } else {
        log(`Unknown request type: ${requestType}`);
        sendToUI('status', {
          message: `Unknown type: ${requestType}`,
          status: 'error'
        });
      }
    } else if (msg.type === 'dump-board') {
      const handler = handlerRegistry.get('boardDump');
      await handler({ action: 'dump' });
    } else if (msg.type === 'load-board') {
      const handler = handlerRegistry.get('boardDump');
      await handler({ 
        action: 'load', 
        boardData: msg.boardData,
        clearExisting: msg.clearExisting 
      });
    } else if (msg.type === 'start-polling') {
      log('Polling started');
    } else if (msg.type === 'stop-polling') {
      log('Polling stopped');
    }
  } catch (e) {
    log(`Error: ${e.message}`);
    sendToUI('status', {
      message: `Error: ${e.message}`,
      status: 'error'
    });
  }
};