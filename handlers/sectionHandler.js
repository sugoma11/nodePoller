// Handler for adding sections (white background rectangles)

async function handle(data) {
  
  const { log, findNodeByTitle } = globalThis.figmaUtils;
  
  try {
    // Debug: log the entire data object
    log(`Section handler received data: ${JSON.stringify(data)}`);
    
    let x, y, width, height;
    
    // Use provided width/height or defaults
    width = data.width || 400;
    height = data.height || 300;
    
    // Parse color (default to white)
    let fillColor = { r: 1, g: 1, b: 1 };
    if (data.color) {
      log(`Received color: ${JSON.stringify(data.color)}`);
      
      if (typeof data.color === 'string') {
        // Handle hex color (e.g., "#ffffff" or "ffffff")
        const hex = data.color.replace('#', '');
        if (hex.length === 6) {
          fillColor = {
            r: parseInt(hex.substring(0, 2), 16) / 255,
            g: parseInt(hex.substring(2, 4), 16) / 255,
            b: parseInt(hex.substring(4, 6), 16) / 255
          };
          log(`Parsed hex to RGB: r=${fillColor.r}, g=${fillColor.g}, b=${fillColor.b}`);
        }
      } else if (Array.isArray(data.color) && data.color.length === 3) {
        // Handle RGB array (e.g., [255, 255, 255] or [1.0, 1.0, 1.0])
        // Check if any value is greater than 1 to determine if it's 0-255 range
        const isNormalized = data.color.every(v => v >= 0 && v <= 1);
        fillColor = {
          r: isNormalized ? data.color[0] : data.color[0] / 255,
          g: isNormalized ? data.color[1] : data.color[1] / 255,
          b: isNormalized ? data.color[2] : data.color[2] / 255
        };
        log(`Parsed array (normalized=${isNormalized}) to RGB: r=${fillColor.r}, g=${fillColor.g}, b=${fillColor.b}`);
      } else if (typeof data.color === 'object' && data.color !== null && 'r' in data.color) {
        // Handle RGB object (e.g., {r: 1, g: 1, b: 1})
        const maxVal = Math.max(data.color.r || 0, data.color.g || 0, data.color.b || 0);
        const isNormalized = maxVal <= 1;
        fillColor = {
          r: isNormalized ? (data.color.r || 0) : (data.color.r || 0) / 255,
          g: isNormalized ? (data.color.g || 0) : (data.color.g || 0) / 255,
          b: isNormalized ? (data.color.b || 0) : (data.color.b || 0) / 255
        };
        log(`Parsed object (normalized=${isNormalized}) to RGB: r=${fillColor.r}, g=${fillColor.g}, b=${fillColor.b}`);
      }
    }
    
    // Determine position
    if (data.topicTitle) {
      // Find node by title and position section below it
      const referenceNode = findNodeByTitle(data.topicTitle);
      
      if (!referenceNode) {
        log(`Warning: Could not find node with title "${data.topicTitle}"`);
        // Fall back to center if provided, otherwise use origin
        if (data.center && Array.isArray(data.center) && data.center.length === 2) {
          x = data.center[0] - width / 2;
          y = data.center[1] - height / 2;
        } else {
          x = x || 0;
          y = y || 0;
        }
      } else {
        // Position below the reference node
        const nodeBottom = referenceNode.y + (referenceNode.height || 0);
        const offset = 20; // Gap between reference node and section
        
        x = referenceNode.x;
        y = nodeBottom + offset;
      }
    } else if (data.center && Array.isArray(data.center) && data.center.length === 2) {
      // Center the section on the provided coordinates
      x = data.center[0] - width / 2;
      y = data.center[1] - height / 2;
    } else {
      // Fallback to origin if neither topicTitle nor center provided
      x = x || 0;
      y = y || 0;
    }
    
    // Create the section (rectangle with white background)
    const section = figma.createRectangle();
    section.x = x;
    section.y = y;
    section.resize(width, height);
    
    // Set fill color
    section.fills = [{
      type: 'SOLID',
      color: fillColor
    }];
    
    // Optional: Add a subtle border
    section.strokes = [{
      type: 'SOLID',
      color: { r: 0.9, g: 0.9, b: 0.9 }
    }];
    section.strokeWeight = 1;
    
    // Set corner radius for a softer look
    section.cornerRadius = 8;
    
    // Name the section
    const sectionName = data.topicTitle 
      ? `Section - ${data.topicTitle}` 
      : 'Section';
    section.name = sectionName;
    
    // Add to current page
    figma.currentPage.appendChild(section);
    
    // Send section to back so it acts as a background
    figma.currentPage.insertChild(0, section);
    
    log(`Section added: ${sectionName} at (${Math.round(x)}, ${Math.round(y)})`);
    
  } catch (e) {
    log(`Error adding section: ${e.message}`);
    throw e;
  }
}

module.exports = {
  handle
};