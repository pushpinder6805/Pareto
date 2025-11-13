import { apiInitializer } from "discourse/lib/api";
import User from "discourse/models/user";

export default apiInitializer("1.19.0", () => {
  const currentUser = User.current();
  if (!currentUser || !currentUser.staff) return;

  function addZendeskButton() {
    document.querySelectorAll(".chat-message-actions-container").forEach((container) => {
      if (container.querySelector(".create-zendesk-ticket")) return;

      const details = container.querySelector(".more-actions-chat");
      if (!details) return;
      const detailsBody = details.querySelector(".select-kit-body");
      if (!detailsBody) return;

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
        const messageText =
          document.querySelector(`[data-id='${messageId}'] .chat-message-text`)?.innerText || "";

        // Extract topic_id if possible
        const topicId =
          window.Discourse?.Chat?.currentChannel?.chatable?.id || 2495; // fallback topic ID

        fetch("/zendesk-plugin/issues", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-CSRF-Token": document
              .querySelector("meta[name='csrf-token']")
              ?.getAttribute("content"),
          },
          body: new URLSearchParams({
            topic_id: topicId,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Zendesk API responded ${res.status}`);
            return res.json();
          })
          .then((data) => {
            console.log("Zendesk ticket created:", data);
            alert("Zendesk ticket created successfully!");
          })
          .catch((err) => {
            console.error(err);
            alert("Failed to create Zendesk ticket.");
          });
      });

      detailsBody.appendChild(btn);
    });
  }

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

