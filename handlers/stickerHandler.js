// Sticker Handler - Adds a sticky note below a topic node

async function handle(request) {
  
  if (!globalThis.figmaUtils || typeof globalThis.figmaUtils.log !== 'function') {
    console.warn('figmaUtils.log is missing!');
  }
  
  const data = typeof request === 'string' ? JSON.parse(request) : request;
  const { topicTitle, content } = data;
  const { findNodeByTitle, log } = globalThis.figmaUtils;
  
  try {
    // Validate request
    if (!topicTitle || !content) {
      log('Error: topicTitle and content are required');
      return null;
    }
    
    // Find the topic node
    const topicNode = findNodeByTitle(topicTitle);
    
    if (!topicNode) {
      log(`Topic "${topicTitle}" not found`);
      return null;
    }
    
    log(`Found topic node: ${topicNode.name}`);
    
    // Load fonts (try multiple styles to avoid errors)
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    } catch (fontError) {
      log(`Font loading warning: ${fontError.message}`);
      // Continue anyway, might work
    }
    
    // Create sticky note
    const stickyNote = figma.createSticky();
    stickyNote.text.characters = content;
    
    // Position the sticky note below the topic
    let x = 0;
    let y = 0;
    
    if (topicNode.absoluteBoundingBox) {
      x = topicNode.absoluteBoundingBox.x;
      y = topicNode.absoluteBoundingBox.y + topicNode.absoluteBoundingBox.height + 50;
    } else if (topicNode.x !== undefined && topicNode.y !== undefined) {
      x = topicNode.x;
      y = topicNode.y + 150;
    } else {
      // Fallback to viewport center
      x = figma.viewport.center.x;
      y = figma.viewport.center.y + 100;
    }
    
    stickyNote.x = x;
    stickyNote.y = y;
    
    // Set reasonable size
    // stickyNote.resize(250, Math.max(stickyNote.height, 100));
    
    log(`Sticker added: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    
    return stickyNote;
  } catch (e) {
    log(`Error in stickerHandler: ${e.message}`);
    return null;
  }
}

module.exports = {
  handle
};