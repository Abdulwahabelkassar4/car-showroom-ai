// /public/js/assistant.js
document.addEventListener('DOMContentLoaded', () => {
  const chatBtn     = document.getElementById('ai-chat-btn');
  const chatPanel   = document.getElementById('ai-chat-panel');
  const chatMessages= document.getElementById('chat-messages');
  const userInput   = document.getElementById('chat-input');
  const sendBtn     = document.getElementById('chat-send-btn');

  chatBtn.addEventListener('click', () => {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'block' : 'none';
  });

  sendBtn.addEventListener('click', async () => {
    const userText = userInput.value.trim();
    if (!userText) return;

    // 1) Show the user's message
    chatMessages.innerHTML += `<div class="user-msg">You: ${userText}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    userInput.value = '';

    try {
      // 2) Send to the assistant endpoint
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });

      // 3) Handle HTTP errors
      if (!response.ok) {
        const text = await response.text();
        console.error('Assistant endpoint error:', response.status, text);
        chatMessages.innerHTML += `<div class="error-msg">Error ${response.status}: see console.</div>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return;
      }

      // 4) Parse the JSON
      const data = await response.json();

      // 5) Show the assistant's text reply
      chatMessages.innerHTML += `<div class="ai-msg">Assistant: ${data.reply}</div>`;

      // 6) If there are suggested cars, render them as clickable links
      if (Array.isArray(data.cars)) {
        data.cars.forEach(car => {
          const soldBadge = car.sold
            ? ` <span style="color:red;">(SOLD)</span>`
            : '';
          const html = `
            <div class="ai-msg" style="margin:6px 0;">
              <a href="#"
                 onclick="loadCarDetails('${car.id}'); return false;"
                 style="color:gold; text-decoration:none; font-weight:bold;"
              >
                🚗 ${car.make} ${car.model} (${car.year}) — $${car.price.toLocaleString()}${soldBadge}
              </a>
            </div>`;
          chatMessages.insertAdjacentHTML('beforeend', html);
        });
      }

      // 7) Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
      console.error(error);
      chatMessages.innerHTML += `<div class="error-msg">Assistant is currently unavailable. Try again later.</div>`;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
});
