import { apiInitializer } from "discourse/lib/api";
import User from "discourse/models/user";

export default apiInitializer("1.19.0", (api) => {
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

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const messageId = container.dataset.id;
        const messageEl = document.querySelector(`[data-id='${messageId}']`);
        const messageText = messageEl?.querySelector(".chat-message-text")?.innerText?.trim() || "(no text)";
        const messageAuthor = messageEl?.querySelector(".username")?.innerText?.trim() || "Unknown";
        const chatUrl = `${window.location.origin}/chat/message/${messageId}`;

        // Pull channel info from Discourse.Chat runtime
        const chatChannel = window.Discourse?.Chat?.currentChannel;
        const channelId = chatChannel?.id;
        const channelName = chatChannel?.title || chatChannel?.name || "Chat Channel";

        // If channel not found, fail gracefully
        if (!channelId) {
          console.error("No chat channel context found.");
          alert("Cannot create Zendesk ticket: missing chat channel context.");
          return;
        }

        // Build title + description
        const subject = `[Chat] ${channelName} — message from ${messageAuthor}`;
        const description = `Message by ${messageAuthor} in channel "${channelName}" (ID: ${channelId})\n\n${messageText}\n\nView message: ${chatUrl}`;

        console.log("Creating Zendesk ticket from chat:", {
          channelId,
          channelName,
          messageId,
          subject,
          description,
        });

        try {
          const res = await fetch("/zendesk-plugin/issues.json", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-CSRF-Token": document
                .querySelector("meta[name='csrf-token']")
                ?.getAttribute("content"),
              Accept: "application/json",
            },
            body: new URLSearchParams({
              // Pass a unique pseudo-topic reference for backend
              // (some Zendesk plugin setups require topic_id — we emulate one)
              topic_id: channelId,
              subject,
              description,
            }),
          });

          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            console.error("Zendesk returned non-JSON response:", text);
            throw new Error(`Zendesk returned non-JSON (${res.status})`);
          }

          if (!res.ok) {
            console.error("Zendesk error:", data);
            throw new Error(`Zendesk API responded ${res.status}`);
          }

          console.log("Zendesk ticket created successfully:", data);
          api.showToast?.("Zendesk ticket created successfully.", {
            title: "Success",
            icon: "check",
          });
        } catch (err) {
          console.error("Zendesk ticket creation failed:", err);
          api.showToast?.("Failed to create Zendesk ticket.", {
            title: "Error",
            icon: "times",
          });
        }
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

