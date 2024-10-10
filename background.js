chrome.action.onClicked.addListener(() => {
  // Get the user's screen dimensions
  chrome.system.display.getInfo((displays) => {
    // Assuming the first display is the primary display
    const display = displays[0];
    const screenWidth = display.bounds.width;
    const screenHeight = display.bounds.height;

    // Set desired window dimensions
    const windowWidth = 600;
    const windowHeight = 600;

    // Calculate the center position
    const top = Math.round((screenHeight - windowHeight) / 2);
    const left = Math.round((screenWidth - windowWidth) / 2);

    // Create the new window at the center
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: windowWidth,
      height: windowHeight,
      top: top,
      left: left
    });
  });
});
