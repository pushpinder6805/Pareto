import { apiInitializer } from "discourse/lib/api";
import User from "discourse/models/user";

export default apiInitializer("1.19.0", () => {
  const currentUser = User.current();
  if (!currentUser || !currentUser.staff) return;

  function addZendeskButton() {
    // Find all open chat action containers
    document.querySelectorAll(".chat-message-actions-container").forEach((container) => {
      // Skip if already added
      if (container.querySelector(".create-zendesk-ticket")) return;

      // Find the 3-dot dropdown details element
      const details = container.querySelector(".more-actions-chat");
      if (!details) return;

      const detailsBody = details.querySelector(".select-kit-body");
      if (!detailsBody) return; // menu not yet open

      // Create our menu item wrapper
      const btn = document.createElement("button");
      btn.className = "chat-message-action create-zendesk-ticket";
      btn.type = "button";
      btn.innerHTML = `
        <svg class="fa d-icon d-icon-life-ring svg-icon"><use href="#life-ring"></use></svg>
        <span class="label">Create Zendesk Ticket</span>
      `;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const messageId = container.dataset.id;
        if (!messageId) return alert("Could not identify message.");

        const messageText =
          document.querySelector(`[data-id='${messageId}'] .chat-message-text`)
            ?.innerText || "";

        const description = `${currentUser.username} selected chat message #${messageId}:\n\n${messageText}\n\n${window.location.origin}/chat/message/${messageId}`;

        fetch("/zendesk/create_ticket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": document
              .querySelector("meta[name='csrf-token']")
              ?.getAttribute("content"),
          },
          body: JSON.stringify({
            subject: `Chat message #${messageId}`,
            description,
            private: false,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Zendesk API responded ${res.status}`);
            return res.json();
          })
          .then(() => alert("Zendesk ticket created successfully."))
          .catch((err) => {
            console.error(err);
            alert("Failed to create Zendesk ticket.");
          });
      });

      // Append to the dropdown menu body
      detailsBody.appendChild(btn);
    });
  }

  // Observe DOM for dropdowns opening
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (
          node.classList.contains("chat-message-actions-container") ||
          node.querySelector(".chat-message-actions-container")
        ) {
          addZendeskButton();
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

