// tableHandler.js
// Handler for adding tables to FigJam board with dynamic cell sizing

async function handle(request) {
  const { log, findNodeByTitle } = globalThis.figmaUtils;
  
  try {
    const { topicTitle, content } = request;
    
    if (!topicTitle || !content || content.length === 0) {
      log('Invalid table request: missing topicTitle or content');
      return;
    }
    
    // Find the topic node
    const topicNode = findNodeByTitle(topicTitle);
    
    if (!topicNode) {
      log(`Topic not found: ${topicTitle}`);
      return;
    }
    
    // Extract headers from the first data item
    const headers = Object.keys(content[0]);
    const numCols = headers.length;
    const numRows = content.length;
    
    // Table styling constants
    const minCellWidth = 120;
    const maxCellWidth = 450;
    const minCellHeight = 50;
    const cellPadding = 16;
    const fontSize = 13;
    const headerFontSize = 14;
    const spacing = 30;
    const charWidth = 7.5;
    const lineHeight = 20;
    
    // Calculate starting position using absoluteBoundingBox
    let startX = 0;
    let startY = 0;
    
    if (topicNode.absoluteBoundingBox) {
      // Use absoluteBoundingBox for accurate positioning
      startX = topicNode.absoluteBoundingBox.x;
      startY = topicNode.absoluteBoundingBox.y + topicNode.absoluteBoundingBox.height + spacing;
    } else if (topicNode.x !== undefined && topicNode.y !== undefined) {
      // Fallback to x/y properties
      startX = topicNode.x;
      startY = topicNode.y + (topicNode.height || 150) + spacing;
    } else {
      // Last resort: use viewport center
      log('Warning: Using viewport center as fallback position');
      startX = figma.viewport.center.x;
      startY = figma.viewport.center.y + 100;
    }
    
    // Load fonts
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }).catch(() => {});
    
    try {
      const fonts = await figma.listAvailableFontsAsync();
      const interFonts = fonts.filter(f => f.fontName.family === "Inter");
      for (const font of interFonts) {
        await figma.loadFontAsync(font.fontName).catch(() => {});
      }
    } catch (e) {
      // Continue if font listing fails
    }
    
    log(`Creating table with ${numRows} rows and ${numCols} columns`);
    
    // Calculate optimal width for each column
    const columnWidths = headers.map((header, colIndex) => {
      let maxLength = header.length;
      
      for (const row of content) {
        const value = String(row[header] || '');
        if (value.length > maxLength) {
          maxLength = value.length;
        }
      }
      
      let width = (maxLength * charWidth) + (cellPadding * 2);
      width = Math.max(minCellWidth, Math.min(maxCellWidth, width));
      
      return width;
    });
    
    // Calculate height for each row (including header)
    const rowHeights = [];
    
    // Calculate header height
    let maxHeaderHeight = minCellHeight;
    for (let col = 0; col < numCols; col++) {
      const cellWidth = columnWidths[col];
      const textWidth = cellWidth - (cellPadding * 2);
      const text = headers[col];
      
      // Estimate lines needed
      const estimatedLines = Math.ceil((text.length * charWidth) / textWidth);
      const estimatedHeight = (estimatedLines * lineHeight) + (cellPadding * 2);
      
      if (estimatedHeight > maxHeaderHeight) {
        maxHeaderHeight = estimatedHeight;
      }
    }
    rowHeights.push(Math.max(minCellHeight, maxHeaderHeight));
    
    // Calculate data row heights
    for (let row = 0; row < numRows; row++) {
      const rowData = content[row];
      let maxRowHeight = minCellHeight;
      
      for (let col = 0; col < numCols; col++) {
        const cellWidth = columnWidths[col];
        const textWidth = cellWidth - (cellPadding * 2);
        const text = String(rowData[headers[col]] || '');
        
        // Estimate lines needed
        const estimatedLines = Math.ceil((text.length * charWidth) / textWidth);
        const estimatedHeight = (estimatedLines * lineHeight) + (cellPadding * 2);
        
        if (estimatedHeight > maxRowHeight) {
          maxRowHeight = estimatedHeight;
        }
      }
      
      rowHeights.push(Math.max(minCellHeight, maxRowHeight));
    }
    
    // Create header row
    let currentX = startX;
    let currentY = startY;
    const allElements = []; // Track all created elements for selection
    
    for (let col = 0; col < numCols; col++) {
      const cellWidth = columnWidths[col];
      const cellHeight = rowHeights[0];
      
      const headerRect = figma.createRectangle();
      headerRect.x = currentX;
      headerRect.y = currentY;
      headerRect.resize(cellWidth, cellHeight);
      headerRect.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
      headerRect.strokes = [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.94 } }];
      headerRect.strokeWeight = 1;
      headerRect.cornerRadius = col === 0 ? 6 : 0; // Rounded corner on first cell
      
      // Create header text
      const headerText = figma.createText();
      headerText.x = currentX + cellPadding;
      headerText.y = currentY + cellPadding;
      headerText.characters = headers[col];
      headerText.fontSize = headerFontSize;
      headerText.fontName = { family: "Inter", style: "Medium" };
      headerText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.3 } }];
      
      headerText.resize(cellWidth - (cellPadding * 2), cellHeight - (cellPadding * 2));
      headerText.textAlignHorizontal = "LEFT";
      headerText.textAlignVertical = "TOP";
      headerText.textAutoResize = "HEIGHT";
      headerText.lineHeight = { value: lineHeight, unit: "PIXELS" };
      
      figma.currentPage.appendChild(headerRect);
      figma.currentPage.appendChild(headerText);
      allElements.push(headerRect, headerText);
      
      currentX += cellWidth;
    }
    
    // Create data rows
    currentY = startY + rowHeights[0];
    
    for (let row = 0; row < numRows; row++) {
      const rowData = content[row];
      const cellHeight = rowHeights[row + 1];
      currentX = startX;
      
      for (let col = 0; col < numCols; col++) {
        const header = headers[col];
        const cellValue = rowData[header] || '';
        const cellWidth = columnWidths[col];
        
        // Create cell rectangle
        const cellRect = figma.createRectangle();
        cellRect.x = currentX;
        cellRect.y = currentY;
        cellRect.resize(cellWidth, cellHeight);
        cellRect.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        cellRect.strokes = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.96 } }];
        cellRect.strokeWeight = 1;
        
        // Create cell text
        const cellText = figma.createText();
        cellText.x = currentX + cellPadding;
        cellText.y = currentY + cellPadding;
        cellText.characters = String(cellValue);
        cellText.fontSize = fontSize;
        cellText.fontName = { family: "Inter", style: "Regular" };
        cellText.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.4 } }];
        
        cellText.resize(cellWidth - (cellPadding * 2), cellHeight - (cellPadding * 2));
        cellText.textAlignHorizontal = "LEFT";
        cellText.textAlignVertical = "TOP";
        cellText.textAutoResize = "HEIGHT";
        cellText.lineHeight = { value: lineHeight, unit: "PIXELS" };
        
        figma.currentPage.appendChild(cellRect);
        figma.currentPage.appendChild(cellText);
        allElements.push(cellRect, cellText);
        
        currentX += cellWidth;
      }
      
      currentY += cellHeight;
    }
    
    // Select and zoom to the table for better UX
    if (allElements.length > 0) {
      figma.currentPage.selection = allElements;
      figma.viewport.scrollAndZoomIntoView(allElements);
    }
    
    log(`Table created successfully with ${numRows} rows and dynamic sizing`);
    
  } catch (error) {
    log(`Error in table handler: ${error.message}`);
    console.error('Table handler error:', error);
  }
}

module.exports = {
  handle
};