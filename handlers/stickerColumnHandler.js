// This is an async function to handle the request
async function handle(request) {
  // Use the utilities exposed on the global object
  const { log, findNodeByTitle } = globalThis.figmaUtils;

  const { topicTitle, content, type } = request;
  const spacing = request.spacing || 50; // Default spacing between stickers

  // --- 1. Validate Input ---
  if (!topicTitle || !content || !Array.isArray(content) || content.length === 0) {
    log(`Invalid request for ${type}: Missing topicTitle or content.`);
    return;
  }

  // --- 2. Find the Anchor Node ---
  const anchorNode = findNodeByTitle(topicTitle);
  if (!anchorNode) {
    log(`Could not find a node with title: "${topicTitle}"`);
    return;
  }

  // --- 3. Prepare for Sticker Creation ---
  // Load fonts
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  } catch (fontError) {
    log(`Font loading warning: ${fontError.message}`);
  }

  // --- 4. Calculate Starting Position ---
  let startX = 0;
  let startY = 0;
  
  if (anchorNode.absoluteBoundingBox) {
    // Use absoluteBoundingBox for accurate positioning
    startX = anchorNode.absoluteBoundingBox.x;
    startY = anchorNode.absoluteBoundingBox.y + anchorNode.absoluteBoundingBox.height + spacing;
  } else if (anchorNode.x !== undefined && anchorNode.y !== undefined) {
    // Fallback to x/y properties
    startX = anchorNode.x;
    startY = anchorNode.y + (anchorNode.height || 150) + spacing;
  } else {
    // Last resort: use viewport center
    log('Warning: Using viewport center as fallback position');
    startX = figma.viewport.center.x;
    startY = figma.viewport.center.y + 100;
  }

  const stickers = [];
  let currentY = startY;

  // --- 5. Loop Through Content and Create Stickers ---
  for (const stickerText of content) {
    try {
      const sticker = figma.createSticky();
      sticker.x = startX; // Align horizontally with the anchor node
      sticker.y = currentY;
      sticker.text.characters = stickerText;
      
      // Set reasonable size
      // sticker.resize(250, Math.max(sticker.height, 100));
      
      // Add the new sticker to the page
      //figma.currentPage.appendChild(sticker);
      //stickers.push(sticker);
      log(`Sticker height: ${sticker.height}`);
      // Update the Y position for the next sticker
      currentY += sticker.height + spacing;

    } catch (e) {
      log(`Error creating sticker with text "${stickerText}": ${e.message}`);
    }
  }

  // --- 6. Finalize ---
  // Select and zoom to the newly created stickers for better user experience
  if (stickers.length > 0) {
    figma.currentPage.selection = stickers;
    figma.viewport.scrollAndZoomIntoView(stickers);
    log(`Successfully added ${stickers.length} stickers under "${topicTitle}".`);
  }
}

module.exports = {
  handle
};