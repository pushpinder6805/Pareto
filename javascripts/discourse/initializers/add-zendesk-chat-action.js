import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  // Only show to staff
  const currentUser = api.getCurrentUser();
  if (!currentUser || !currentUser.staff) return;

  // Use addChatMessageAction instead of decorateChatMessageAction
  api.addChatMessageAction({
    id: "create-zendesk-ticket",
    icon: "life-ring",
    label: "Create Zendesk Ticket",
    position: "dropdown", // shows in “...” menu
    action(message) {
      const link = `${window.location.origin}/chat/message/${message.id}`;
      const description = `${message.user.username} wrote:\n\n${message.message}\n\n${link}`;

      fetch("/zendesk/create_ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document
            .querySelector("meta[name='csrf-token']")
            .getAttribute("content"),
        },
        body: JSON.stringify({
          subject: `Chat message #${message.id}`,
          description,
          private: false,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Zendesk API responded ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log("Zendesk ticket created:", data);
          api.showToast?.("Zendesk ticket created successfully.", {
            title: "Success",
            icon: "check",
          }) || alert("Zendesk ticket created successfully.");
        })
        .catch((err) => {
          console.error("Zendesk ticket creation failed:", err);
          api.showToast?.("Failed to create Zendesk ticket.", {
            title: "Error",
            icon: "times",
          }) || alert("Failed to create Zendesk ticket.");
        });
    },
  });
});

