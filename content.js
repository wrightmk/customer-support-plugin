// Function to create a button
function createButton(id, text, clickHandler) {
  let button = document.createElement("button");
  button.id = id;
  button.textContent = text;
  button.addEventListener("click", clickHandler);
  return button;
}

// Function to inject the widget
function injectWidget() {
  // Check if the widget has already been injected
  if (document.getElementById("gorgias-helper-widget")) {
    return;
  }

  // Find the sidebar
  let sidebar = document.getElementsByClassName(
    "infobar infobar-panel d-print-none hidden-panel"
  )[0].children[1].children[1];

  // If the sidebar exists, inject the widget
  if (sidebar) {
    // Create the widget
    let widget = document.createElement("div");
    let summary = document.createElement("div");

    widget.id = "gorgias-helper-widget";
    widget.style = "margin: 1rem;";

    summary.id = "gorgias-helper-summary";
    summary.textContent = "Summary Area";
    summary.style =
      "border: 1px solid #d2d7de; border-radius: 0.25rem; min-height: 200px; margin-top: 1rem; padding: 0.5rem; width: 280px;";

    let box = document.createElement("div");
    box.style =
      "display:flex; flex-direction: row; align-items: center; justify-content: space-between; width: 280px;";

    // Create the buttons
    let button1 = createButton("button1", "Draft", handleButton1Click);
    let button2 = createButton("button2", "Replace", handleButton2Click);
    let button3 = createButton("button3", "Summarize", handleButton3Click);

    box.appendChild(button1);
    box.appendChild(button2);
    box.appendChild(button3);

    button1.style =
      "all: unset; cursor:pointer;padding-top: 0.5rem;padding-bottom: 0.5rem;padding-left: 1rem;padding-right: 1rem;border-radius: 0.25rem;font-weight: 700;color: #ffffff;background-color: #3B82F6;";
    button2.style =
      "all: unset; cursor:pointer;padding-top: 0.5rem;padding-bottom: 0.5rem;padding-left: 1rem;padding-right: 1rem;border-radius: 0.25rem;font-weight: 700;color: #ffffff;background-color: #3B82F6;";
    button3.style =
      "all: unset; cursor:pointer;padding-top: 0.5rem;padding-bottom: 0.5rem;padding-left: 1rem;padding-right: 1rem;border-radius: 0.25rem;font-weight: 700;color: #ffffff;background-color: #3B82F6;";

    // Add the buttons to the widget
    widget.appendChild(box);
    widget.appendChild(summary);

    // Inject the widget into the sidebar
    sidebar.appendChild(widget);
  }
}

// Set up a MutationObserver to watch for changes in the DOM
let observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    // If nodes were added, try to inject the widget
    if (mutation.addedNodes.length > 0) {
      injectWidget();
    }
  });
});

// Start observing the document with the configured parameters
observer.observe(document, { childList: true, subtree: true });

// Function to handle the click event for the first button
function handleButton1Click(event) {
  // Define the sample draft
  let sampleDraft =
    "Thank you for contacting us. We're looking into your issue and will get back to you as soon as possible.";

  // Find the response text area
  let responseTextArea = document.querySelector("[data-text]");

  // Push the sample draft into the response text area
  dispatchPaste(responseTextArea, sampleDraft);
}

const dataTransfer = new DataTransfer();

function dispatchPaste(target, text) {
  // this may be 'text/html' if it's required
  dataTransfer.setData("text/plain", text);

  target.dispatchEvent(
    new ClipboardEvent("paste", {
      clipboardData: dataTransfer,

      // need these for the event to reach Draft paste handler
      bubbles: true,
      cancelable: true,
    })
  );

  // clear DataTransfer Data
  dataTransfer.clearData();
}

document.addEventListener("selectionchange", async (event) => {
  // Setting this in the chrome local storage because window.getSelection doesn't have reference to the correct context in handeButton2Click

  if (window.getSelection().anchorNode) {
    currentSelection = window.getSelection();

    let response = await chrome.runtime.sendMessage({
      action: "replaceSelectedText",
      currentSelection: {
        text: currentSelection.toString(),
        anchorOffset: currentSelection.anchorOffset,
        focusOffset: currentSelection.focusOffset,
      },
    });
  }
});

function simulateSelectAll(element) {
  // Create a new event
  let event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "a",
    metaKey: true,
  });

  // Dispatch the event
  element.dispatchEvent(event);
}

// Function to handle the click event for the second button
async function handleButton2Click(event) {
  const { currentSelection } = await chrome.storage.local.get(
    "currentSelection"
  );

  let selectedText = currentSelection.text;

  let responseTextArea = document.querySelector("[data-text]");

  // If there's no selected text, replace the whole text
  if (!selectedText) {
    // Create a range object
    const range = document.createRange();

    // Set the range to encompass the entire text content of the <div> element
    range.selectNodeContents(responseTextArea);

    // Get the selection object
    const selection = window.getSelection();

    // Remove any existing selections
    selection.removeAllRanges();

    // Add the new range to the selection
    selection.addRange(range);

    let replacedText = responseTextArea.textContent.replaceAll(/./g, "?");

    // SetTimeout puts the dispatchPaste function after the replaceAll method on the callstack
    setTimeout(() => {
      dispatchPaste(responseTextArea, replacedText);
    });
  } else {
    // Replace each character in the selected text with '?'
    let replacedText = selectedText.replace(/./g, "?");

    // Create a new Range object
    let range = document.createRange();

    // Set the start and end of the range to the start and end of the selection
    range.setStart(responseTextArea.firstChild, currentSelection.anchorOffset);
    range.setEnd(responseTextArea.firstChild, currentSelection.focusOffset);

    // Replace the selected text with the new node
    range.deleteContents();

    // Push the sample draft into the response text area
    dispatchPaste(responseTextArea, replacedText);

    let response = await chrome.runtime.sendMessage({
      action: "replaceSelectedText",
      currentSelection: {},
    });
  }
}

// Function to handle the click event for the third button
async function handleButton3Click(event) {
  // Extract the message ID from the current URL
  let messageId = window.location.pathname.split("app/ticket/")[1];
  let domain = window.location.host.split(".gorgias.com")[0];

  // Send a message to the background script asking it to summarize the conversation
  try {
    // let response =
    const { summary } = await chrome.runtime.sendMessage({
      action: "getMessagesAndSummarize",
      messageId,
      domain,
    });

    // Display the summary in the widget
    document.getElementById("gorgias-helper-summary").textContent = summary;
  } catch (error) {
    console.error("Error:", error);
  }
}
