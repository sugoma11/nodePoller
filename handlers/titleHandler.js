// Handler for creating topic titles

async function handle(data) {
  try {
    const { topicTitle, center, size, font, color } = data;
    const { log } = globalThis.figmaUtils;

    // Validate required fields
    if (!topicTitle) {
      log('Error: topicTitle is required');
      return;
    }
    
    if (!center || center.length !== 2) {
      log('Error: location must be a tuple [x, y]');
      return;
    }
    
    // Create text node
    const textNode = figma.createText();
    
    // Load the font (default to Inter if not specified)
    const fontFamily = font || 'Inter';
    const fontWeight = 'Bold'; // Use bold for topic titles
    
    try {
      await figma.loadFontAsync({ family: fontFamily, style: fontWeight });
      textNode.fontName = { family: fontFamily, style: fontWeight };
    } catch (e) {
      // Fallback to Inter Regular if specified font fails
      log(`Font ${fontFamily} not found, using Inter Regular`);
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      textNode.fontName = { family: 'Inter', style: 'Regular' };
    }
    
    // Set text content
    textNode.characters = topicTitle;
    
    // Set font size (default to 24 if not specified)
    const fontSize = size || 24;
    textNode.fontSize = fontSize;
    
    // Set position
    textNode.x = center[0];
    textNode.y = center[1];
    
    // Set color if provided (RGB values 0-255)
    if (color && color.length === 3) {
      textNode.fills = [{
        type: 'SOLID',
        color: {
          r: color[0] / 255,
          g: color[1] / 255,
          b: color[2] / 255
        }
      }];
    }
    
    // Set node name for easier identification
    textNode.name = `Topic: ${topicTitle}`;
    
    // Auto-resize to fit content
    textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    
    log(`Created topic: "${topicTitle}" at position (${center[0]}, ${center[1]})`);
    
    // Optionally select the created node
    figma.currentPage.selection = [textNode];
    figma.viewport.scrollAndZoomIntoView([textNode]);
    
  } catch (e) {
    log(`Error creating topic: ${e.message}`);
    throw e;
  }
}

module.exports = {
  handle
};