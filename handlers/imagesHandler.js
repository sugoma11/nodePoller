async function handle(data) {
  const { topicTitle, content, spacing = 50 } = data;
  
  if (!topicTitle || !content || content.length === 0) {
    globalThis.figmaUtils.log('Missing required fields: topicTitle or content');
    return;
  }

  try {
    // Find the topic node
    const topicNode = globalThis.figmaUtils.findNodeByTitle(topicTitle);
    
    if (!topicNode) {
      globalThis.figmaUtils.log(`Topic "${topicTitle}" not found`);
      return;
    }

    globalThis.figmaUtils.log(`Found topic: ${topicNode.name}`);

    // Calculate starting position using absoluteBoundingBox for accuracy
    let startX = 0;
    let startY = 0;
    
    if (topicNode.absoluteBoundingBox) {
      startX = topicNode.absoluteBoundingBox.x;
      startY = topicNode.absoluteBoundingBox.y + topicNode.absoluteBoundingBox.height + spacing;
    } else if (topicNode.x !== undefined && topicNode.y !== undefined) {
      startX = topicNode.x;
      startY = topicNode.y + (topicNode.height || 150) + spacing;
    } else {
      globalThis.figmaUtils.log('Warning: Using viewport center as fallback position');
      startX = figma.viewport.center.x;
      startY = figma.viewport.center.y + 100;
    }

    // Track current Y position dynamically based on actual image heights
    let currentY = startY;
    const createdRects = [];

    // Process each base64 image
    for (let i = 0; i < content.length; i++) {
      const base64String = content[i];
      
      try {
        // Remove data URL prefix if present
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        
        // Manual base64 decode (compatible with Figma plugin environment)
        const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let bytes = [];
        
        for (let j = 0; j < base64Data.length; j += 4) {
          const encoded1 = base64chars.indexOf(base64Data[j]);
          const encoded2 = base64chars.indexOf(base64Data[j + 1]);
          const encoded3 = base64chars.indexOf(base64Data[j + 2]);
          const encoded4 = base64chars.indexOf(base64Data[j + 3]);
          
          bytes.push((encoded1 << 2) | (encoded2 >> 4));
          if (encoded3 !== 64) bytes.push(((encoded2 & 15) << 4) | (encoded3 >> 2));
          if (encoded4 !== 64) bytes.push(((encoded3 & 3) << 6) | encoded4);
        }
        
        const uint8Array = new Uint8Array(bytes);

        // Create image in Figma
        const image = figma.createImage(uint8Array);
        const rect = figma.createRectangle();
        
        // Get original image dimensions
        const { width, height } = await image.getSizeAsync();
        
        // Set rectangle to exact image dimensions (preserves original shape)
        rect.resize(width, height);
        
        // Set image fill with FIT mode to preserve aspect ratio
        rect.fills = [{
          type: 'IMAGE',
          scaleMode: 'FIT',
          imageHash: image.hash
        }];
        
        // Position the image at current Y position
        rect.x = startX;
        rect.y = currentY;
        
        // Add a name to the image node
        rect.name = `Image ${i + 1} - ${topicTitle}`;

        // Add to page
        figma.currentPage.appendChild(rect);
        createdRects.push(rect);

        // Update currentY for next image: current position + this image's height + spacing
        currentY += height + spacing;

        globalThis.figmaUtils.log(`Added image ${i + 1}/${content.length} (${width}x${height})`);
        
      } catch (imageError) {
        globalThis.figmaUtils.log(`Error processing image ${i + 1}: ${imageError.message}`);
        console.error('Image processing error:', imageError);
      }
    }

    // Select and zoom to created images
    if (createdRects.length > 0) {
      figma.currentPage.selection = createdRects;
      figma.viewport.scrollAndZoomIntoView(createdRects);
    }

    globalThis.figmaUtils.log(`Successfully added ${content.length} image(s) under "${topicTitle}"`);
    
  } catch (error) {
    globalThis.figmaUtils.log(`Error in imagesHandler: ${error.message}`);
    console.error('Handler error:', error);
  }
}

module.exports = {
  handle
};