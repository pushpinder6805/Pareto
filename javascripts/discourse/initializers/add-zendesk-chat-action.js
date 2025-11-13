import { apiInitializer } from "discourse/lib/api";
import User from "discourse/models/user"; // ← proper import

export default apiInitializer("1.19.0", () => {
  const currentUser = User.current();
  if (!currentUser || !currentUser.staff) return;

  function addZendeskAction() {
    document
      .querySelectorAll(".chat-message-actions-menu .dropdown-menu")
      .forEach((menu) => {
        if (menu.querySelector(".create-zendesk-ticket")) return;

        const li = document.createElement("li");
        li.classList.add("create-zendesk-ticket");

        const a = document.createElement("a");
        a.href = "#";
        a.innerHTML =
          '<svg class="fa d-icon d-icon-life-ring svg-icon"><use href="#life-ring"></use></svg> Create Zendesk Ticket';

        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const messageEl = menu.closest(".chat-message");
          const messageId = messageEl?.dataset?.messageId;
          const messageText =
            messageEl?.querySelector(".chat-message-text")?.innerText || "";

          if (!messageId) return alert("Could not identify message.");

          const description = `${currentUser.username} selected message #${messageId}:\n\n${messageText}\n\n${window.location.origin}/chat/message/${messageId}`;

          fetch("/zendesk/create_ticket", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": document
                .querySelector("meta[name='csrf-token']")
                .getAttribute("content"),
            },
            body: JSON.stringify({
              subject: `Chat message #${messageId}`,
              description,
              private: false,
            }),
          })
            .then((res) => {
              if (!res.ok)
                throw new Error(`Zendesk API responded ${res.status}`);
              return res.json();
            })
            .then(() => alert("Zendesk ticket created successfully."))
            .catch((err) => {
              console.error(err);
              alert("Failed to create Zendesk ticket.");
            });
        });

        li.appendChild(a);
        menu.appendChild(li);
      });
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length) addZendeskAction();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

