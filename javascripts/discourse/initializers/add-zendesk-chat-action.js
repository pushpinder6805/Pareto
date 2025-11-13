import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  // Only visible to staff
  const currentUser = api.getCurrentUser();
  if (!currentUser || !currentUser.staff) return;

  // Add new Chat message action
  api.decorateChatMessageAction((message, helper) => {
    return {
      id: "create-zendesk-ticket",
      icon: "life-ring",
      label: "Create Zendesk Ticket",
      classNames: ["create-zendesk-ticket"],

      action() {
        const link = `${window.location.origin}/chat/message/${message.id}`;
        const description = `${message.user.username} wrote:\n\n${message.message}\n\n${link}`;

        // POST to Discourse’s Zendesk plugin endpoint (server handles auth/config)
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
            private: false, // adjust if you want internal tickets
          }),
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Zendesk API responded with ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            console.log("Zendesk ticket created:", data);
            // Notify user visually
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
    };
  });
});

