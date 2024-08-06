var counter = 0;
let selectedGroup = null;
let selectedUser = null;
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/index.html";
}

function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.exp * 1000 < Date.now();
}

if (isTokenExpired(token)) {
  localStorage.removeItem("token");
  alert("Session expired. Please log in again.");
  window.location.href = "/index.html";
}

const socket = io({
  auth: {
    token: token,
    serverOffset: 0,
  },
  ackTimeout: 10000,
  retries: 3,
});

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const toggleBtn = document.getElementById("toggle-btn");
const groupSelect = document.getElementById("groupSelect");
const userSelect = document.getElementById("userSelect");
const selectedInfo = document.getElementById("selected-info");

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value.trim() !== "") {
    if (selectedGroup || selectedUser) {
      console.log("Sending message after pressing Submit:", input.value);
      socket.emit(
        "chat message",
        input.value,
        `${socket.id}-${counter++}`,
        (error) => {
          if (error) {
            console.error("Error Emitting Message", error);
            alert("Error sending message: " + error);
          } else {
            input.value = "";
          }
        }
      );
    } else {
      alert("Please select a group or user to send a message.");
    }
  }
});

toggleBtn.addEventListener("click", function () {
  if (toggleBtn.innerHTML == "Connect") {
    window.location.reload();
  } else if (toggleBtn.innerHTML == "Disconnect") {
    socket.disconnect();
    toggleBtn.innerHTML = "Connect";
  }
});

function handleGroupSelection(groupId, groupName) {
  selectedGroup = groupId;
  selectedUser = null;
  userSelect.value = "";
  selectedInfo.textContent = `Group Selected: ${groupName}`;
  console.log(`Group Selected: ${groupId}`);
  updateMessageList();
}

function handleUserSelection(userId, userName) {
  selectedUser = userId;
  selectedGroup = null;
  groupSelect.value = "";
  selectedInfo.textContent = `User Selected: ${userName}`;
  console.log(`User Selected: ${userId}`);
  updateMessageList();
}

groupSelect.addEventListener("change", function () {
  const selectedGroupId = groupSelect.value;
  const selectedGroupName = groupSelect.options[groupSelect.selectedIndex].text;

  if (selectedGroupId) {
    handleGroupSelection(selectedGroupId, selectedGroupName);
    console.log(
      "Selected Group (change event listener):",
      selectedGroupId,
      " with name:",
      selectedGroupName
    );

    socket.emit("select group", selectedGroupId, (error) => {
      if (error) {
        alert("Error: " + error);
      } else {
        updateMessageList();
      }
    });
  }
});

userSelect.addEventListener("change", function () {
  const selectedUserId = userSelect.value;
  const selectedUserName = userSelect.options[userSelect.selectedIndex].text;

  if (selectedUserId) {
    handleUserSelection(selectedUserId, selectedUserName);
    socket.emit("select user", selectedUserId, (error) => {
      if (error) {
        alert("Error: " + error);
      } else {
        updateMessageList();
      }
    });
  }
});

function updateMessageList() {
  messages.innerHTML = "";

  let eventType = selectedGroup
    ? "fetch group messages"
    : selectedUser
    ? "fetch user messages"
    : null;

  if (eventType) {
    socket.emit(eventType, selectedGroup || selectedUser);

    socket.once("fetched group messages", function (fetchMessages) {
      console.log("Fetched group messages:", fetchMessages);
      if (fetchMessages && Array.isArray(fetchMessages)) {
        if (fetchMessages.length === 0) {
          console.log("No messages to display as fetchMessages is empty");
          messages.innerHTML = "<li>No messages to display</li>";
        } else {
          fetchMessages.forEach(({ message, sender }) => {
            const item = document.createElement("li");
            item.innerHTML = `<img src="${sender.profilePhoto}" alt="Profile Photo" width="30" height="30"> <strong>${sender.username}</strong>: ${message}`;
            messages.appendChild(item);
          });
          window.scrollTo(0, document.body.scrollHeight);
        }
      } else {
        console.log(
          "No messages to display as fetchMessages is null or not an array 2"
        );
        messages.innerHTML = "<li>No messages to display</li>";
      }
    });

    socket.once("fetched user messages", function (fetchMessages) {
      console.log("Fetched user messages:", fetchMessages);

      if (fetchMessages && Array.isArray(fetchMessages)) {
        if (fetchMessages.length === 0) {
          console.log("No messages to display as fetchMessages is empty");
          messages.innerHTML = "<li>No messages to display</li>";
        } else {
          fetchMessages.forEach(({ message, sender }) => {
            const item = document.createElement("li");
            item.innerHTML = `<img src="${sender.profilePhoto}" alt="Profile Photo" width="30" height="30"> <strong>${sender.username}</strong>: ${message}`;
            messages.appendChild(item);
          });
          window.scrollTo(0, document.body.scrollHeight);
        }
      } else {
        console.log(
          "No messages to display as fetchMessages is null or not an array 2"
        );
        messages.innerHTML = "<li>No messages to display</li>";
      }
    });
  } else {
    console.log("No group or user selected");
  }
}

// Handle incoming chat messages
socket.on("chat message",(data)=>{
console.log('Data received:',data);

const { message, sender, clientOffset } = data;

  console.log("Message received from server and displayed:", message);
  console.log('Sender: ',sender);
  console.log('Client: ',clientOffset);
  try {
    if (
        clientOffset &&
      (selectedGroup && clientOffset.startsWith(socket.id)) ||
      (selectedUser && clientOffset.startsWith(socket.id))
    ) {
      const item = document.createElement("li");
      item.innerHTML = `<img src="${sender.profilePhoto}" alt="Profile Photo" width="30" height="30"> <strong>${sender.username}</strong>: ${message}`;
      messages.appendChild(item);
      window.scrollTo(0, document.body.scrollHeight);
    } else {
      console.log("Message received but not displayed:", message);
    }
  } catch (error) {
    console.log("Error in chat message event:", error);
  }
});

// Handle socket disconnection
socket.on("disconnect", () => {
  console.log("User disconnected");
});

// Fetch user groups
fetch("/user/getUserGroups", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    return response.json();
  })
  .then((groups) => {
    console.log("Groups fetched from API:", groups);
    if (groups.length === 0) {
      alert("You are not a member of any group.");
    }
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group._id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    });
  })
  .catch((error) => {
    console.error("Error fetching user groups:", error);
  });

// Fetch all users
fetch("/user/getAllUsers", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    return response.json();
  })
  .then((users) => {
    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user._id;
      option.textContent = user.username;
      userSelect.appendChild(option);
    });
  })
  .catch((error) => {
    console.error("Error fetching users:", error);
  });
