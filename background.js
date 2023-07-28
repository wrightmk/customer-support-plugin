const OpenAI = require("openai");

async function handleGetMessageAndSummarize(request, sendResponse) {
  // Retrieve the API key from storage
  // TODO: use chrome storage

  let apiKey = "Basic <GORGIAS_API_KEY>";

  // Make a GET request to the Gorgias API to get the messages for the ticket
  try {
    let response = await fetch(
      `https://${request.domain}.gorgias.com/api/messages?order_by=created_datetime%3Aasc&ticket_id=${request.messageId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();

    console.log("data", data);

    // Loop over the messages and create a summary
    let messages = data.data.map((message) => message.stripped_text).join(" ");
    console.log("messages???", messages);

    // TODO: use chrome storage

    // Make a call to the OpenAI ChatGPT turbo API and summarize the conversation
    const openai = new OpenAI({
      apiKey: "<OPENAI_API_KEY>",
    });

    // Make a call to the OpenAI ChatGPT turbo API and summarize the conversation
    let openAIResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: `
                You have an email thread transcript. Act as the author and provide a detailed summary in the same language as the transcript that is less than 200 words of the following array.
                
                You must follow the rules: 
                - tldr should be informative and act as a replacement for the original transcript to the point that the user won't know there is an original transcript this means the output shouldn't have words like "speaker", "transcript", "author"
                - tldr should not mention the author or speaker at all should act as an independent writing.
                - tldr should be precise and to the point.
                
                ${messages}
                `,
        },
      ],
    });

    const summary = openAIResponse["choices"][0]["message"]["content"];

    const normalizedSummary = summary.split("\n").join("");

    sendResponse({ summary: normalizedSummary });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Function to handle a message from a content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "replaceSelectedText") {
    chrome.storage.local.set({
      currentSelection: request.currentSelection,
    });
  }

  if (request.action === "getMessagesAndSummarize") {
    handleGetMessageAndSummarize(request, sendResponse);
  }
  return true;
});
