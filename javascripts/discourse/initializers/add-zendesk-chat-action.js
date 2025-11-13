import { apiInitializer } from "discourse/lib/api";
import User from "discourse/models/user";

export default apiInitializer("1.19.0", () => {
  const currentUser = User.current();
  if (!currentUser || !currentUser.staff) return;

  function injectZendeskAction(container) {
    // Find all message action menus currently open
    container.querySelectorAll(".chat-message-actions, .chat-message-actions-menu").forEach((menuWrapper) => {
      // Find the existing action buttons inside (Discourse Chat adds them dynamically)
      const existing = menuWrapper.querySelector(".create-zendesk-ticket");
      if (existing) return; // Already added

      // Determine where to append — button group or menu
      const buttonContainer =
        menuWrapper.querySelector(".chat-message-actions-buttons") ||
        menuWrapper.querySelector("ul") ||
        menuWrapper;

      if (!buttonContainer) return;

      // Create new action element
      const actionEl = document.createElement("button");
      actionEl.className = "chat-message-action create-zendesk-ticket";
      actionEl.type = "button";
      actionEl.innerHTML = `
        <svg class="fa d-icon d-icon-life-ring svg-icon"><use href="#life-ring"></use></svg>
        <span class="label">Create Zendesk Ticket</span>
      `;

      actionEl.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const messageEl = menuWrapper.closest(".chat-message");
        const messageId = messageEl?.dataset?.messageId;
        const messageText = messageEl?.querySelector(".chat-message-text")?.innerText?.trim() || "";

        if (!messageId) {
          alert("Could not identify message.");
          return;
        }

        const description = `${currentUser.username} selected message #${messageId}:\n\n${messageText}\n\n${window.location.origin}/chat/message/${messageId}`;

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

      // Insert our new button or menu item
      buttonContainer.appendChild(actionEl);
    });
  }

  // Observe chat DOM for any new menus or message actions opening
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (
          node.classList.contains("chat-message-actions") ||
          node.classList.contains("chat-message-actions-menu") ||
          node.querySelector(".chat-message-actions") ||
          node.querySelector(".chat-message-actions-menu")
        ) {
          injectZendeskAction(node);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

