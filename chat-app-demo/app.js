// Chat data structure
const chats = {
  general: {
    name: 'general',
    messages: [
      {
        id: 1,
        author: 'Alice',
        text: 'Hey everyone!',
        timestamp: new Date(Date.now() - 600000),
        own: false,
      },
      {
        id: 2,
        author: 'Bob',
        text: 'Hi Alice! How are you?',
        timestamp: new Date(Date.now() - 480000),
        own: true,
      },
      {
        id: 3,
        author: 'Alice',
        text: 'I\'m doing great! How about you?',
        timestamp: new Date(Date.now() - 360000),
        own: false,
      },
      {
        id: 4,
        author: 'Bob',
        text: 'All good! Just working on some projects.',
        timestamp: new Date(Date.now() - 240000),
        own: true,
      },
    ],
  },
  support: {
    name: 'support',
    messages: [
      {
        id: 1,
        author: 'Support Agent',
        text: 'Hello! How can I help you today?',
        timestamp: new Date(Date.now() - 1200000),
        own: false,
      },
      {
        id: 2,
        author: 'Bob',
        text: 'I have a question about my account',
        timestamp: new Date(Date.now() - 900000),
        own: true,
      },
      {
        id: 3,
        author: 'Support Agent',
        text: 'Sure! What\'s your question?',
        timestamp: new Date(Date.now() - 600000),
        own: false,
      },
    ],
  },
};

let currentChat = 'general';

// DOM Elements
const chatItems = document.querySelectorAll('.chat-item');
const messagesArea = document.getElementById('messages-area');
const chatTitle = document.getElementById('chat-title');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Event Listeners
chatItems.forEach((item) => {
  item.addEventListener('click', () => {
    switchChat(item.dataset.chat);
  });
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

// Functions
function switchChat(chatName) {
  // Update current chat
  currentChat = chatName;

  // Update active state
  chatItems.forEach((item) => {
    if (item.dataset.chat === chatName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update chat title
  chatTitle.textContent = chatName;

  // Render messages for this chat
  renderMessages();

  // Clear input
  messageInput.value = '';
  messageInput.focus();
}

function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) {
    return;
  }

  // Create new message
  const newMessage = {
    id: chats[currentChat].messages.length + 1,
    author: 'Bob',
    text: text,
    timestamp: new Date(),
    own: true,
  };

  // Add to chat
  chats[currentChat].messages.push(newMessage);

  // Clear input
  messageInput.value = '';

  // Re-render messages
  renderMessages();

  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function renderMessages() {
  // Clear messages area
  messagesArea.innerHTML = '';

  const messages = chats[currentChat].messages;

  messages.forEach((msg) => {
    const messageElement = createMessageElement(msg);
    messagesArea.appendChild(messageElement);
  });

  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function createMessageElement(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.own ? 'own' : ''}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  bubbleDiv.textContent = message.text;

  const timestampDiv = document.createElement('div');
  timestampDiv.className = 'message-timestamp';
  timestampDiv.textContent = formatTime(message.timestamp);

  messageDiv.appendChild(bubbleDiv);
  messageDiv.appendChild(timestampDiv);

  return messageDiv;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Initialize - render the general chat on load
renderMessages();
messageInput.focus();
